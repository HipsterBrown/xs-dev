import { print, filesystem, system, semver } from 'gluegun'
import { type as platformType } from 'os'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from './constants'
import { moddableExists, getModdableVersion } from './moddable'
import upsert from '../patching/upsert'
import { installDeps as installMacDeps } from './esp32/mac'
import { installDeps as installLinuxDeps } from './esp32/linux'
import { installDeps as installWinDeps } from './esp32/windows'
import { setEnv, ensureModdableCommandPrompt } from './windows'
import { sourceEnvironment } from '../system/exec'

export default async function(): Promise<void> {
  const OS = platformType().toLowerCase()
  const isWindows = OS === "windows_nt"
  const ESP_IDF_REPO = 'https://github.com/espressif/esp-idf.git'
  const ESP_BRANCH_V4 = 'v4.4.3'
  const ESP_BRANCH_V5 = 'v5.1.1'
  const ESP32_DIR = filesystem.resolve(INSTALL_DIR, 'esp32')
  const IDF_PATH = filesystem.resolve(ESP32_DIR, 'esp-idf')

  await sourceEnvironment()

  const spinner = print.spin()
  spinner.start('Setting up esp32 tools')

  // 0. ensure Moddable exists
  if (!moddableExists()) {
    spinner.fail(
      'Moddable tooling required. Run `xs-dev setup` before trying again.'
    )
    process.exit(1)
  }

  if (isWindows) {
    await ensureModdableCommandPrompt(spinner)
  }

  // 1. ensure ~/.local/share/esp32 directory
  spinner.info('Ensuring esp32 install directory')
  filesystem.dir(ESP32_DIR)

  // 2. clone esp-idf into ~/.local/share/esp32/esp-idf
  if (filesystem.exists(IDF_PATH) === false) {
    spinner.start('Cloning esp-idf repo')
    const moddableVersion = await getModdableVersion() ?? ''
    const branch = (moddableVersion.includes("branch") || semver.satisfies(moddableVersion ?? '', '>= 4.2.x')) ? ESP_BRANCH_V5 : ESP_BRANCH_V4
    await system.spawn(
      `git clone --depth 1 --single-branch -b ${branch} --recursive ${ESP_IDF_REPO} ${IDF_PATH}`
    )
    spinner.succeed()
  }

  // 3. Install build and run dependencies
  spinner.start('Installing build dependencies')

  if (OS === 'darwin') {
    await installMacDeps(spinner)
  }

  if (OS === 'linux') {
    await installLinuxDeps(spinner)
  }

  if (isWindows) {
    await installWinDeps(spinner, ESP32_DIR, IDF_PATH)
  }

  // 4. append IDF_PATH env export to shell profile
  if (isWindows) {
    spinner.info('Configuring IDF_PATH environment variable')
    await setEnv("IDF_PATH", IDF_PATH)
  } else {
    if (process.env.IDF_PATH === undefined) {
      spinner.info('Configuring $IDF_PATH')
      process.env.IDF_PATH = IDF_PATH
      await upsert(EXPORTS_FILE_PATH, `export IDF_PATH=${IDF_PATH}`)
    }
  }

  // 5. cd to IDF_PATH, run install.sh
  if (isWindows) {
    spinner.start('Running ESP-IDF Tools install.bat')
    await system.exec(`${IDF_PATH}\\install.bat`, {
      cwd: IDF_PATH,
      stdout: process.stdout,
    })
    spinner.succeed()
  } else {
    spinner.start('Installing esp-idf tooling')
    await system.exec('./install.sh', {
      cwd: IDF_PATH,
      shell: process.env.SHELL,
      stdout: process.stdout,
    })
    spinner.succeed()
  }

  // 6. append 'source $IDF_PATH/export.sh' to shell profile
  if (isWindows) {
    await upsert(EXPORTS_FILE_PATH, `pushd %IDF_PATH% && call "%IDF_TOOLS_PATH%\\idf_cmd_init.bat" && popd`)
  } else {
    spinner.info('Sourcing esp-idf environment')
    await upsert(EXPORTS_FILE_PATH, `source $IDF_PATH/export.sh 1> /dev/null`)
  }

  spinner.succeed(`
  Successfully set up esp32 platform support for Moddable!
  Test out the setup by starting a new ${isWindows ? 'Moddable Command Prompt' : 'terminal session'}, plugging in your device, and running: xs-dev run --example helloworld --device=esp32
  If there is trouble finding the correct port, pass the "--port" flag to the above command with the ${isWindows ? "COM Port" : "path to the /dev.cu.*"} that matches your device.
  `)
}
