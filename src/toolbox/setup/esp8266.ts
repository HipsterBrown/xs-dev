import { print, filesystem, system } from 'gluegun'
import axios from 'axios'
import { finished } from 'stream'
import { promisify } from 'util'
import { extract } from 'tar-fs'
import { createGunzip } from 'zlib'
import { Extract as ZipExtract } from 'unzip-stream'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from './constants'
import upsert from '../patching/upsert'

const finishedPromise = promisify(finished)

export default async function (): Promise<void> {
  const TOOLCHAIN =
    'https://www.moddable.com/private/esp8266.toolchain.darwin.tgz'
  const ARDUINO_CORE =
    'https://github.com/esp8266/Arduino/releases/download/2.3.0/esp8266-2.3.0.zip'
  const ESP_RTOS_REPO = 'https://github.com/espressif/ESP8266_RTOS_SDK.git'
  const ESP_BRANCH = 'release/v3.2'
  const ESP_DIR = filesystem.resolve(INSTALL_DIR, 'esp')
  const RTOS_PATH = filesystem.resolve(ESP_DIR, 'ESP8266_RTOS_SDK')
  const TOOLCHAIN_PATH = filesystem.resolve(ESP_DIR, 'toolchain')
  const ARDUINO_CORE_PATH = filesystem.resolve(ESP_DIR, 'esp8266-2.3.0')

  const spinner = print.spin()
  spinner.start('Setting up esp8266 tools')

  // 0. ensure Moddable exists
  if (process.env.MODDABLE === undefined) {
    spinner.fail(
      'Moddable tooling required. Run `xs-dev setup` before trying again.'
    )
    process.exit(1)
  }

  // 1. ensure ~/.local/share/esp directory
  spinner.info('Ensuring esp directory')
  filesystem.dir(ESP_DIR)
  filesystem.file(EXPORTS_FILE_PATH)

  // 2. download and untar xtensa toolchain
  if (filesystem.exists(TOOLCHAIN_PATH) === false) {
    spinner.start('Downloading xtensa toolchain')
    const writer = extract(ESP_DIR, { readable: true })
    const gunzip = createGunzip()
    const response = await axios.get(TOOLCHAIN, {
      responseType: 'stream',
    })
    response.data.pipe(gunzip).pipe(writer)
    await finishedPromise(writer)
    spinner.succeed()
  }

  // 3. download and unzip esp8266 core for arduino
  if (filesystem.exists(ARDUINO_CORE_PATH) === false) {
    spinner.start('Downloading arduino core tooling')
    const writer = ZipExtract({ path: ESP_DIR })
    const response = await axios.get(ARDUINO_CORE, {
      responseType: 'stream',
    })
    response.data.pipe(writer)
    await finishedPromise(writer)
    spinner.succeed()
  }

  // 4. clone esp8266 RTOS SDK
  if (filesystem.exists(RTOS_PATH) === false) {
    spinner.start('Cloning esp8266 RTOS SDK repo')
    await system.spawn(
      `git clone -b ${ESP_BRANCH} ${ESP_RTOS_REPO} ${RTOS_PATH}`
    )
    spinner.succeed()
  }

  // 5. ensure python, pip, and pyserial are installed
  if (system.which('python') === null) {
    spinner.start('Installing python from homebrew')
    await system.exec('brew install python')
    spinner.succeed()
  }

  if (system.which('pip') === null) {
    spinner.start('Installing pip through ensurepip')
    await system.exec('python -m ensurepip')
    spinner.succeed()
  }

  spinner.start('Installing pyserial through pip')
  await system.exec('python -m pip install pyserial')
  spinner.succeed()

  // 7. create ESP_BARE env export in shell profile
  if (process.env.ESP_BASE === undefined) {
    spinner.info('Configuring $ESP_BASE')
    process.env.ESP_BASE = ESP_DIR
    await upsert(EXPORTS_FILE_PATH, `export ESP_BASE=${process.env.ESP_BASE}`)
  }

  spinner.succeed(`
  Successfully set up esp8266 platform support for moddable!
  Test out the setup by starting a new terminal session, plugging in your device, and running: xs-dev run --example helloworld --device esp8266
  If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the "/dev.cu.*" that matches your device.
  `)
}
