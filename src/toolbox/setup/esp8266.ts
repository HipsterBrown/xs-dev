import { print, filesystem, system } from 'gluegun'
import axios from 'axios'
import { finished } from 'stream'
import { promisify } from 'util'
import { extract } from 'tar-fs'
import { createGunzip } from 'zlib'
import { Extract as ZipExtract } from 'unzip-stream'
import { type as platformType } from 'os'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from './constants'
import { moddableExists } from './moddable'
import upsert from '../patching/upsert'
import { installDeps as installMacDeps } from './esp8266/mac'
import { installDeps as installLinuxDeps } from './esp8266/linux'
import { installDeps as installWindowsDeps } from './esp8266/windows'
import { ensureModdableCommandPrompt } from './windows'
import { DEVICE_ALIAS } from '../prompt/devices'
import { Device } from '../../types'
import { sourceEnvironment } from '../system/exec'

const finishedPromise = promisify(finished)

export default async function(): Promise<void> {
  const OS = platformType().toLowerCase() as Device
  const isWindows = OS === "windows_nt"
  const TOOLCHAIN = `https://github.com/Moddable-OpenSource/tools/releases/download/v1.0.0/esp8266.toolchain.${isWindows ? 'win32' : OS}.tgz`
  const ARDUINO_CORE =
    'https://github.com/esp8266/Arduino/releases/download/2.3.0/esp8266-2.3.0.zip'
  const ESP_RTOS_REPO = 'https://github.com/espressif/ESP8266_RTOS_SDK.git'
  const ESP_BRANCH = 'release/v3.2'
  const ESP_DIR = filesystem.resolve(INSTALL_DIR, 'esp')
  const RTOS_PATH = filesystem.resolve(ESP_DIR, 'ESP8266_RTOS_SDK')
  const TOOLCHAIN_PATH = filesystem.resolve(ESP_DIR, 'toolchain')
  const ARDUINO_CORE_PATH = filesystem.resolve(ESP_DIR, 'esp8266-2.3.0')

  await sourceEnvironment()

  const spinner = print.spin()
  spinner.start('Setting up esp8266 tools')

  // 0. ensure Moddable exists
  if (!moddableExists()) {
    spinner.fail(
      `Moddable tooling required. Run 'xs-dev setup --device ${DEVICE_ALIAS[OS]}' before trying again.`
    )
    process.exit(1)
  }

  if (isWindows) {
    await ensureModdableCommandPrompt(spinner)
  }

  // 1. ensure ~/.local/share/esp directory
  spinner.info('Ensuring esp8266 directory')
  filesystem.dir(ESP_DIR)

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
      `git clone --depth 1 --single-branch -b ${ESP_BRANCH} ${ESP_RTOS_REPO} ${RTOS_PATH}`
    )
    spinner.succeed()
  }

  // 5. ensure python, pip, and pyserial are installed
  if (OS === 'darwin') {
    await installMacDeps(spinner)
  }

  if (OS === 'linux') {
    await installLinuxDeps(spinner)
  }

  if (isWindows) {
    try {
      await installWindowsDeps(spinner, ESP_DIR)
    } catch (error) {
      print.error(`Windows dependencies failed to install. Please review the information above.`)
      process.exit(1)
    }
  }

  // 7. create ESP_BASE env export in shell profile
  if (OS === 'darwin' || OS === 'linux') {
    if (process.env.ESP_BASE === undefined) {
      spinner.info('Configuring $ESP_BASE')
      process.env.ESP_BASE = ESP_DIR
      await upsert(EXPORTS_FILE_PATH, `export ESP_BASE=${process.env.ESP_BASE}`)
    }
  } // Windows case is handled in ./esp8266/windows.ts

  spinner.succeed(`
  Successfully set up esp8266 platform support for Moddable!
  Test out the setup by starting a new ${isWindows ? 'Moddable Command Prompt' : 'terminal session'}, plugging in your device, and running: xs-dev run --example helloworld --device esp8266
  If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the "/dev.cu.*" that matches your device.
  `)
}
