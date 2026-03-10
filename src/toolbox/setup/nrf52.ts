import { createWriteStream, existsSync } from 'node:fs'
import { arch, type as platformType } from 'node:os'
import { finished, Transform, type TransformOptions } from 'node:stream'
import { extract } from 'tar-fs'
import { promisify } from 'node:util'
import { mkdir } from 'node:fs/promises'
import { Extract as ZipExtract } from 'unzip-stream'
import { resolve } from 'node:path'
import type { LZMAOptions, Unxz } from 'node-liblzma'
import type { Device } from '../../types.js'
import { DEVICE_ALIAS } from '../prompt/devices.js'
import { execWithSudo, sourceEnvironment } from '../system/exec.js'
import { EXPORTS_FILE_PATH, INSTALL_DIR } from './constants.js'
import { moddableExists } from './moddable.js'
import { setEnv } from './windows.js'
import upsert from '../patching/upsert.js'
import { installPython } from './nrf52/windows.js'
import { isFailure } from '../system/errors.js'
import { fetchStream } from '../system/fetch.js'
import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

const finishedPromise = promisify(finished)

const ARCH_ALIAS: Record<string, string> = {
  darwin_arm64: 'darwin-arm64',
  darwin_x64: 'darwin-x86_64',
  linux_x64: 'x86_64',
  windows_nt_x64: 'mingw-w64-i686',
}

export default async function* nrf52Setup(
  args: Record<string, unknown>,
  prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  yield { type: 'step:start', message: 'Setting up nrf52 tools' }

  const OS = platformType().toLowerCase() as Device
  const isWindows = OS === 'windows_nt'
  const TOOLCHAIN = `arm-gnu-toolchain-12.2.rel1-${ARCH_ALIAS[`${OS}_${arch()}`]}-arm-none-eabi`
  const TOOLCHAIN_DOWNLOAD = `https://developer.arm.com/-/media/Files/downloads/gnu/12.2.rel1/binrel/${TOOLCHAIN}.${isWindows ? 'zip' : 'tar.xz'}`
  const ADAFRUIT_NRF52_BOOTLOADER_UF2CONV_DOWNLOAD =
    'https://github.com/Moddable-OpenSource/tools/releases/download/v1.0.0/uf2conv.py'
  const NRF5_SDK = 'nRF5_SDK_17.0.2_d674dde'
  const NRF5_SDK_DOWNLOAD = `https://github.com/Moddable-OpenSource/tools/releases/download/v1.0.0/${NRF5_SDK}-mod.zip`
  const NRF52_DIR = resolve(INSTALL_DIR, 'nrf52')
  const TOOLCHAIN_PATH = resolve(NRF52_DIR, TOOLCHAIN)
  const UF2CONV_PATH = resolve(NRF52_DIR, 'uf2conv.py')
  const NRF5_SDK_PATH = resolve(NRF52_DIR, NRF5_SDK)

  await sourceEnvironment()

  if (!moddableExists()) {
    yield { type: 'step:fail', message: `Moddable tooling required. Run 'xs-dev setup --device ${DEVICE_ALIAS[OS]}' before trying again.` }
    return
  }

  // Windows-specific setup already handled by setEnv

  let createUnxz: ((lzmaOption?: LZMAOptions, transformOption?: TransformOptions) => Unxz) = () => {
    return new Transform() as Unxz
  }
  if (!isWindows) {
    try {
      ; ({ createUnxz } = await import('node-liblzma'))
    } catch (error) {
      yield { type: 'step:fail', message: 'Unable to extract Arm Embedded Toolchain without XZ utils (https://tukaani.org/xz/). Please install that dependency on your system and reinstall xs-dev before attempting this setup again. See https://xs-dev.js.org/troubleshooting for more info.' }
      return
    }
  }

  try {
    yield { type: 'info', message: 'Ensuring nrf52 directory' }
    await mkdir(NRF52_DIR, { recursive: true })
  } catch (error) {
    yield { type: 'step:fail', message: `Error creating nrf52 directory: ${String(error)}` }
    return
  }

  try {
    if (!existsSync(TOOLCHAIN_PATH)) {
      yield { type: 'step:start', message: 'Downloading GNU Arm Embedded Toolchain' }

      const writer = isWindows
        ? ZipExtract({ path: NRF52_DIR })
        : extract(NRF52_DIR, { readable: true })
      const download = await fetchStream(TOOLCHAIN_DOWNLOAD)
      const stream = isWindows ? download : download.pipe(createUnxz())
      stream.pipe(writer)
      await finishedPromise(writer)
      yield { type: 'step:done' }
    }

    if (!existsSync(UF2CONV_PATH)) {
      yield { type: 'step:start', message: 'Downloading Adafruit nRF52 Bootloader' }
      const writer = createWriteStream(UF2CONV_PATH, { mode: 0o755 })
      const download = await fetchStream(ADAFRUIT_NRF52_BOOTLOADER_UF2CONV_DOWNLOAD)
      download.pipe(writer)
      await finishedPromise(writer)
      yield { type: 'step:done' }
    }

    if (!existsSync(NRF5_SDK_PATH)) {
      yield { type: 'step:start', message: 'Downloading nRF5 SDK' }
      const writer = ZipExtract({ path: NRF52_DIR })
      const download = await fetchStream(NRF5_SDK_DOWNLOAD)
      download.pipe(writer)
      await finishedPromise(writer)
      yield { type: 'step:done' }
    }
  } catch (error) {
    yield { type: 'step:fail', message: `Error downloading dependencies: ${String(error)}` }
    return
  }

  try {
    if (OS === 'darwin' || OS === 'linux') {
      if (
        process.env.NRF_ROOT === undefined ||
        process.env.NRF_SDK_DIR === undefined
      ) {
        yield { type: 'info', message: 'Configuring $NRF_ROOT and $NRF_SDK_DIR' }
        process.env.NRF_ROOT = NRF52_DIR
        process.env.NRF_SDK_DIR = NRF5_SDK_PATH
        await upsert(
          EXPORTS_FILE_PATH,
          `export NRF_ROOT=${process.env.NRF_ROOT}\nexport NRF_SDK_DIR=${process.env.NRF_SDK_DIR}`,
        )
      }
    } else {
      process.env.NRF_ROOT = NRF52_DIR
      process.env.NRF52_SDK_PATH = NRF5_SDK_PATH
      await setEnv('NRF_ROOT', NRF52_DIR)
      await setEnv('NRF52_SDK_PATH', NRF5_SDK_PATH)
      for await (const event of installPython(prompter)) {
        yield event
      }
    }

    if (OS === 'linux') {
      try {
        const result = await execWithSudo('adduser $USER dialout')
        if (isFailure(result)) {
          yield { type: 'warning', message: `Unable to provide ttyUSB0 permission to the current user. Please run "sudo adduser <username> dialout" before trying to attempting to build projects for your nrf52 device.` }
        }
      } catch (_error) {
        yield { type: 'warning', message: `Unable to provide ttyUSB0 permission to the current user. Please run "sudo adduser <username> dialout" before trying to attempting to build projects for your nrf52 device.` }
      }
    }
  } catch (error) {
    yield { type: 'step:fail', message: `Error configuring environment: ${String(error)}` }
    return
  }

  yield {
    type: 'step:done',
    message: `Successfully set up nrf52 platform support for Moddable!
Test out the setup by starting a new ${isWindows ? 'Moddable Command Prompt' : 'terminal session'}, plugging in your device, and running: xs-dev run --example helloworld --device nrf52`,
  }
}
