import axios from 'axios'
import { createWriteStream } from 'fs'
import { filesystem, print } from 'gluegun'
import { arch, type as platformType } from 'os'
import { finished } from 'stream'
import { extract } from 'tar-fs'
import { promisify } from 'util'
import { Extract as ZipExtract } from 'unzip-stream'
import { Device } from '../../types'
import { DEVICE_ALIAS } from '../prompt/devices'
import { execWithSudo, sourceEnvironment } from '../system/exec'
import { EXPORTS_FILE_PATH, INSTALL_DIR } from './constants'
import { moddableExists } from './moddable'
import { ensureModdableCommandPrompt, setEnv } from './windows'
import upsert from '../patching/upsert'
import { installPython } from './nrf52/windows'

const finishedPromise = promisify(finished)

const ARCH_ALIAS: Record<string, string> = {
  darwin_arm64: 'darwin-arm64',
  darwin_x64: 'darwin-x86_64',
  linux_x64: 'x86_64',
  windows_nt_x64: 'mingw-w64-i686'
}
export default async function(): Promise<void> {
  const OS = platformType().toLowerCase() as Device
  const isWindows = OS === "windows_nt"
  const TOOLCHAIN = `arm-gnu-toolchain-12.2.rel1-${ARCH_ALIAS[`${OS}_${arch()}`]}-arm-none-eabi`
  const TOOLCHAIN_DOWNLOAD = `https://developer.arm.com/-/media/Files/downloads/gnu/12.2.rel1/binrel/${TOOLCHAIN}.${isWindows ? 'zip' : 'tar.xz'}`
  const ADAFRUIT_NRF52_BOOTLOADER_UF2CONV_DOWNLOAD = 'https://github.com/Moddable-OpenSource/tools/releases/download/v1.0.0/uf2conv.py'
  const NRF5_SDK = 'nRF5_SDK_17.0.2_d674dde'
  const NRF5_SDK_DOWNLOAD = `https://github.com/Moddable-OpenSource/tools/releases/download/v1.0.0/${NRF5_SDK}-mod.zip`
  const NRF52_DIR = filesystem.resolve(INSTALL_DIR, 'nrf52')
  const TOOLCHAIN_PATH = filesystem.resolve(NRF52_DIR, TOOLCHAIN)
  const UF2CONV_PATH = filesystem.resolve(NRF52_DIR, 'uf2conv.py')
  const NRF5_SDK_PATH = filesystem.resolve(NRF52_DIR, NRF5_SDK)

  await sourceEnvironment()

  const spinner = print.spin()
  spinner.start('Setting up nrf52 tools')

  if (!moddableExists()) {
    spinner.fail(
      `Moddable tooling required. Run 'xs-dev setup --device ${DEVICE_ALIAS[OS]}' before trying again.`
    )
    process.exit(1)
  }

  if (isWindows) {
    await ensureModdableCommandPrompt(spinner)
  }

  let createUnxz: any;
  if (!isWindows) {
    try {
      // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
      // @ts-ignore
      ({ createUnxz } = await import('node-liblzma'))
    } catch (error) {
      spinner.fail("Unable to extract Arm Embedded Toolchain without XZ utils (https://tukaani.org/xz/). Please install that dependency on your system and reinstall xs-dev before attempting this setup again. See https://xs-dev.js.org/troubleshooting for more info.")
      process.exit(1)
    }
  }

  spinner.info('Ensuring nrf52 directory')
  filesystem.dir(NRF52_DIR)

  if (filesystem.exists(TOOLCHAIN_PATH) === false) {
    spinner.start('Downloading GNU Arm Embedded Toolchain')

    const writer = isWindows ? ZipExtract({ path: NRF52_DIR }) : extract(NRF52_DIR, { readable: true })
    const unxz = createUnxz()
    const response = await axios.get(TOOLCHAIN_DOWNLOAD, {
      responseType: 'stream',
    })
    const stream = isWindows ? response.data : response.data.pipe(unxz)
    stream.pipe(writer)
    await finishedPromise(writer)
    spinner.succeed()
  }

  if (filesystem.exists(UF2CONV_PATH) === false) {
    spinner.start('Downloading Adafruit nRF52 Bootloader')
    const writer = createWriteStream(UF2CONV_PATH, { mode: 0o755 })
    const response = await axios.get(ADAFRUIT_NRF52_BOOTLOADER_UF2CONV_DOWNLOAD, {
      responseType: 'stream',
    })
    response.data.pipe(writer)
    await finishedPromise(writer)
    spinner.succeed()
  }

  if (filesystem.exists(NRF5_SDK_PATH) === false) {
    spinner.start('Downloading nRF5 SDK')
    const writer = ZipExtract({ path: NRF52_DIR })
    const response = await axios.get(NRF5_SDK_DOWNLOAD, {
      responseType: 'stream',
    })
    response.data.pipe(writer)
    await finishedPromise(writer)
    spinner.succeed()
  }

  if (OS === 'darwin' || OS === 'linux') {
    if (process.env.NRF_ROOT === undefined || process.env.NRF_SDK_DIR === undefined) {
      spinner.info('Configuring $NRF_ROOT and $NRF_SDK_DIR')
      process.env.NRF_ROOT = NRF52_DIR
      process.env.NRF_SDK_DIR = NRF5_SDK_PATH
      await upsert(EXPORTS_FILE_PATH, `export NRF_ROOT=${process.env.NRF_ROOT}\nexport NRF_SDK_DIR=${process.env.NRF_SDK_DIR}`)
    }
  } else {
    process.env.NRF_ROOT = NRF52_DIR
    process.env.NRF52_SDK_PATH = NRF5_SDK_PATH
    await setEnv('NRF_ROOT', NRF52_DIR)
    await setEnv('NRF52_SDK_PATH', NRF5_SDK_PATH)
    try {
      await installPython(spinner)
    } catch (error) { // Command Prompt restart needed
      process.exit(1)
    }
  }

  if (OS === 'linux') {
    try {
      await execWithSudo('adduser $USER dialout', { process })
    } catch (_error) {
      print.warning(`Unable to provide ttyUSB0 permission to the current user. Please run "sudo adduser <username> dialout" before trying to attempting to build projects for your nrf52 device.`)
    }
  }

  spinner.succeed(`
  Successfully set up nrf52 platform support for Moddable!
  Test out the setup by starting a new ${isWindows ? 'Moddable Command Prompt' : 'terminal session'}, plugging in your device, and running: xs-dev run --example helloworld --device nrf52
  `)
}
