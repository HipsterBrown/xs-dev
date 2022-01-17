import { print, filesystem, system } from 'gluegun'
import axios from 'axios'
import { finished } from 'stream/promises'
import { extract } from 'tar-fs'
import { createGunzip } from 'zlib'
import { Extract as ZipExtract } from 'unzip-stream'
import { INSTALL_DIR, PROFILE_PATH } from './constants'
import upsert from '../patching/upsert'

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

  print.info('Setting up esp8266 tools')

  // 0. ensure Moddable exists
  if (process.env.MODDABLE === undefined) {
    print.warning(
      'Moddable tooling required. Run `xs-dev setup` before trying again.'
    )
    process.exit(1)
  }

  // 1. ensure ~/.local/share/esp directory
  print.info('Ensuring esp directory')
  filesystem.dir(ESP_DIR)

  // 2. download and untar xtensa toolchain
  if (filesystem.exists(TOOLCHAIN_PATH) === false) {
    const spinner = print.spin()
    spinner.start('Downloading xtensa toolchain')
    const writer = extract(ESP_DIR, { readable: true })
    const gunzip = createGunzip()
    const response = await axios.get(TOOLCHAIN, {
      responseType: 'stream',
    })
    response.data.pipe(gunzip).pipe(writer)
    await finished(writer)
    spinner.succeed()
  }

  // 3. download and unzip esp8266 core for arduino
  if (filesystem.exists(ARDUINO_CORE_PATH) === false) {
    const spinner = print.spin()
    spinner.start('Downloading arduino core tooling')
    const writer = ZipExtract({ path: ESP_DIR })
    const response = await axios.get(ARDUINO_CORE, {
      responseType: 'stream',
    })
    response.data.pipe(writer)
    await finished(writer)
    spinner.succeed()
  }

  // 4. clone esp8266 RTOS SDK
  if (filesystem.exists(RTOS_PATH) === false) {
    print.info('Cloning esp8266 RTOS SDK repo')
    await system.spawn(
      `git clone -b ${ESP_BRANCH} ${ESP_RTOS_REPO} ${RTOS_PATH}`
    )
  }

  // 5. ensure python, pip, and pyserial are installed
  if (system.which('python') === null) {
    print.info('Installing python from homebrew')
    await system.spawn('brew install python')
  }

  if (system.which('pip') === null) {
    print.info('Installing pip through easy_install')
    await system.spawn('sudo easy_install pip')
  }

  print.info('Installing pyserial through pip')
  await system.spawn('python -m pip install pyserial')

  // 7. create ESP_BARE env export in shell profile
  if (process.env.ESP_BASE === undefined) {
    print.info('Configuring $ESP_BASE')
    process.env.ESP_BASE = ESP_DIR
    await upsert(PROFILE_PATH, `export ESP_BASE=${process.env.ESP_BASE}`)
  }

  print.success(`
  Successfully set up esp8266 platform support for moddable!
  Test out the setup by plugging in your device and running: xs-dev run --example helloworld --device esp8266
  If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the "/dev.cu.*" that matches your device.
  `)
}
