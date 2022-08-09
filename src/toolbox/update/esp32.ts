import { print, filesystem, system, patching } from 'gluegun'
import { type as platformType } from 'os'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from '../setup/constants'
import { moddableExists } from '../setup/moddable'
import upsert from '../patching/upsert'
import { installDeps as installMacDeps } from '../setup/esp32/mac'
import { installDeps as installLinuxDeps } from '../setup/esp32/linux'

export default async function (): Promise<void> {
  const OS = platformType().toLowerCase()
  const ESP_BRANCH = 'v4.4.2'
  const ESP32_DIR = filesystem.resolve(INSTALL_DIR, 'esp32')
  const IDF_PATH = filesystem.resolve(ESP32_DIR, 'esp-idf')

  const spinner = print.spin()
  spinner.start('Updating up esp32 tools')

  // 0. ensure Moddable exists
  if (!moddableExists()) {
    spinner.fail(
      'Moddable tooling required. Run `xs-dev setup` before trying again.'
    )
    process.exit(1)
  }

  // 1. ensure ~/.local/share/esp32 directory
  spinner.info('Ensuring esp32 install directory')
  if (
    filesystem.exists(ESP32_DIR) === false ||
    filesystem.exists(IDF_PATH) === false
  ) {
    spinner.fail(
      'ESP32 tooling required. Run `xs-dev setup --device esp32` before trying again.'
    )
    process.exit(1)
  }

  // 2. update local esp-idf repo
  if (filesystem.exists(IDF_PATH) === 'dir') {
    spinner.start('Updating esp-idf repo')
    await system.spawn(`git fetch --all --tags`, { cwd: IDF_PATH })
    await system.spawn(`git checkout ${ESP_BRANCH}`, { cwd: IDF_PATH })
    await system.spawn(`git submodule update --init --recursive`, {
      cwd: IDF_PATH,
    })
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

  // 4. append IDF_PATH env export to shell profile
  if (process.env.IDF_PATH === undefined) {
    spinner.info('Configuring $IDF_PATH')
    process.env.IDF_PATH = IDF_PATH
    await upsert(EXPORTS_FILE_PATH, `export IDF_PATH=${IDF_PATH}`)
  }

  // remove sourced IDF_PATH/export settings before install
  // https://github.com/espressif/esp-idf/issues/8314#issuecomment-1024881587
  await patching.replace(
    EXPORTS_FILE_PATH,
    `source $IDF_PATH/export.sh 1> /dev/null\n`,
    ''
  )
  await system.exec(`source ${EXPORTS_FILE_PATH}`, {
    shell: process.env.SHELL,
  })

  // 5. cd to IDF_PATH, run install.sh
  spinner.start('Rebuilding esp-idf tooling')
  await system.exec('./install.sh', {
    cwd: IDF_PATH,
    shell: process.env.SHELL,
    stdout: process.stdout,
  })
  spinner.succeed()

  // 6. append 'source $IDF_PATH/export.sh' to shell profile
  spinner.info('Sourcing esp-idf environment')
  await upsert(EXPORTS_FILE_PATH, `source $IDF_PATH/export.sh 1> /dev/null\n`)
  await system.exec('source $IDF_PATH/export.sh', {
    shell: process.env.SHELL,
  })

  // 7. Remove existing build output directories
  const BUILD_DIR = filesystem.resolve(
    process.env.MODDABLE ?? '',
    'build',
    'bin',
    'esp32'
  )
  const TMP_DIR = filesystem.resolve(
    process.env.MODDABLE ?? '',
    'build',
    'tmp',
    'esp32'
  )
  filesystem.remove(BUILD_DIR)
  filesystem.remove(TMP_DIR)

  spinner.succeed(`
  Successfully updated esp32 platform support for Moddable!
  Test out the setup by starting a new terminal session, plugging in your device, and running: xs-dev run --example helloworld --device=esp32
  If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the "/dev.cu.*" that matches your device.
  `)
}
