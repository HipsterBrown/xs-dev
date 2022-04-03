import { print, filesystem, system } from 'gluegun'
import { type as platformType } from 'os'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from './constants'
import { moddableExists } from './moddable'
import upsert from '../patching/upsert'
import { installDeps as installMacDeps } from './esp32/mac'
import { installDeps as installLinuxDeps } from './esp32/linux'

export default async function (): Promise<void> {
  const OS = platformType().toLowerCase()
  const ESP_IDF_REPO = 'https://github.com/espressif/esp-idf.git'
  const ESP_BRANCH = 'v4.4'
  const ESP32_DIR = filesystem.resolve(INSTALL_DIR, 'esp32')
  const IDF_PATH = filesystem.resolve(ESP32_DIR, 'esp-idf')

  const spinner = print.spin()
  spinner.start('Setting up esp32 tools')

  // 0. ensure Moddable exists
  if (!moddableExists()) {
    spinner.fail(
      'Moddable tooling required. Run `xs-dev setup` before trying again.'
    )
    process.exit(1)
  }

  // 1. ensure ~/.local/share/esp32 directory
  spinner.info('Ensuring esp32 install directory')
  filesystem.dir(ESP32_DIR)

  // 2. clone esp-idf into ~/.local/share/esp32/esp-idf
  if (filesystem.exists(IDF_PATH) === false) {
    spinner.start('Cloning esp-idf repo')
    await system.spawn(
      `git clone -b ${ESP_BRANCH} --recursive ${ESP_IDF_REPO} ${IDF_PATH}`
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

  // 4. append IDF_PATH env export to shell profile
  if (process.env.IDF_PATH === undefined) {
    spinner.info('Configuring $IDF_PATH')
    process.env.IDF_PATH = IDF_PATH
    await upsert(EXPORTS_FILE_PATH, `export IDF_PATH=${IDF_PATH}`)
  }

  // 5. cd to IDF_PATH, run install.sh
  spinner.start('Installing esp-idf tooling')
  await system.exec('./install.sh', {
    cwd: IDF_PATH,
    shell: process.env.SHELL,
    stdout: process.stdout,
  })
  spinner.succeed()

  // 6. append 'source $IDF_PATH/export.sh' to shell profile
  spinner.info('Sourcing esp-idf environment')
  await upsert(EXPORTS_FILE_PATH, `source $IDF_PATH/export.sh 1> /dev/null`)
  await system.exec('source $IDF_PATH/export.sh', {
    shell: process.env.SHELL,
  })

  spinner.succeed(`
  Successfully set up esp32 platform support for Moddable!
  Test out the setup by starting a new terminal session, plugging in your device, and running: xs-dev run --example helloworld --device=esp32
  If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the "/dev.cu.*" that matches your device.
  `)
}
