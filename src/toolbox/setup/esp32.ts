import { print, filesystem, system, semver } from 'gluegun'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from './constants'
import upsert from '../patching/upsert'

export default async function (): Promise<void> {
  const ESP_IDF_REPO = 'https://github.com/espressif/esp-idf.git'
  const ESP_BRANCH = 'v4.3.1'
  const ESP32_DIR = filesystem.resolve(INSTALL_DIR, 'esp32')
  const IDF_PATH = filesystem.resolve(ESP32_DIR, 'esp-idf')

  const spinner = print.spin()
  spinner.start('Setting up esp32 tools')

  // 0. ensure Moddable exists
  if (process.env.MODDABLE === undefined) {
    spinner.fail(
      'Moddable tooling required. Run `xs-dev setup` before trying again.'
    )
    process.exit(1)
  }

  // 1. ensure ~/.local/share/esp32 directory
  spinner.info('Ensuring esp32 install directory')
  filesystem.dir(ESP32_DIR)
  filesystem.file(EXPORTS_FILE_PATH)

  // 2. clone esp-idf into ~/.local/share/esp32/esp-idf
  if (filesystem.exists(IDF_PATH) === false) {
    spinner.start('Cloning esp-idf repo')
    await system.spawn(
      `git clone -b ${ESP_BRANCH} --recursive ${ESP_IDF_REPO} ${IDF_PATH}`
    )
    spinner.succeed()
  }

  // 3. brew install python3, cmake, ninja, dfu-util
  spinner.start('Installing build dependencies: python, cmake, ninja, dfu-util')

  if (
    system.which('python') === null ||
    // get python verion, check if v3
    semver.satisfies(
      (await system.exec('python --version', { trim: true }))
        .toString()
        .split(' ')
        .pop(),
      '>= 3.x.x'
    )
  ) {
    await system.exec('brew install python')
  }

  if (system.which('cmake') === null) {
    await system.exec('brew install cmake')
  }

  if (system.which('ninja') === null) {
    await system.exec('brew install ninja')
  }

  if (system.which('dfu-util') === null) {
    await system.exec('brew install dfu-util')
  }

  // 4. install pip, if needed
  if (system.which('pip3') === null) {
    spinner.start('Installing pip3')
    await system.exec('python3 -m ensurepip --user')
  }

  // 5. pip install pyserial, if needed
  spinner.start('Installing pyserial through pip3')
  await system.exec('python3 -m pip install pyserial')

  // 6. append IDF_PATH env export to shell profile
  if (process.env.IDF_PATH === undefined) {
    spinner.info('Configuring $IDF_PATH')
    process.env.IDF_PATH = IDF_PATH
    await upsert(EXPORTS_FILE_PATH, `export IDF_PATH=${IDF_PATH}`)
  }

  // 7. cd to IDF_PATH, run install.sh
  spinner.start('Installing esp-idf tooling')
  await system.exec('./install.sh', {
    cwd: IDF_PATH,
    shell: process.env.SHELL,
    stdout: process.stdout,
  })
  spinner.succeed()

  // 8. append 'source $IDF_PATH/export.sh' to shell profile
  spinner.info('Sourcing esp-idf environment')
  await upsert(EXPORTS_FILE_PATH, `source $IDF_PATH/export.sh`)
  await system.exec('source $IDF_PATH/export.sh', {
    shell: process.env.SHELL,
  })

  spinner.succeed(`
  Successfully set up esp32 platform support for Moddable!
  Test out the setup by starting a new terminal session, plugging in your device, and running: xs-dev run --example helloworld --device=esp32
  If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the "/dev.cu.*" that matches your device.
  `)
}
