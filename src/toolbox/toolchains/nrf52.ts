import { createWriteStream, existsSync, rmSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { finished, Transform, type TransformOptions } from 'node:stream'
import { promisify } from 'node:util'
import { resolve, join } from 'node:path'
import { extract } from 'tar-fs'
import { Extract as ZipExtract } from 'unzip-stream'
import type { LZMAOptions, Unxz } from 'node-liblzma'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from '../setup/constants.js'
import { moddableExists } from '../setup/moddable.js'
import { execWithSudo, sourceEnvironment, which } from '../system/exec.js'
import { setEnv } from '../setup/windows.js'
import upsert from '../patching/upsert.js'
import { isFailure } from '../system/errors.js'
import { fetchStream } from '../system/fetch.js'
import { execaCommand } from 'execa'
import type { Toolchain, HostContext, VerifyResult } from './interface.js'
import type { OperationEvent } from '../../lib/events.js'
import type { Prompter } from '../../lib/prompter.js'

const finishedPromise = promisify(finished)

const ARCH_ALIAS: Record<string, string> = {
  mac_arm64: 'darwin-arm64',
  mac_x64: 'darwin-x86_64',
  lin_x64: 'x86_64',
  win_x64: 'mingw-w64-i686',
}

const NRF5_SDK = 'nRF5_SDK_17.0.2_d674dde'

async function* installPython(prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
  if (which('python') === null) {
    try {
      await execaCommand('where winget')
    } catch (error) {
      yield {
        type: 'info',
        message:
          'Python 2.7 is required. You can download it from python.org/downloads or install via Windows Package Manager (winget).',
      }
      yield {
        type: 'info',
        message:
          'Install winget from the Microsoft Store if needed, then re-run this setup.',
      }
      yield {
        type: 'step:fail',
        message: 'Python is required',
      }
      return
    }

    try {
      yield { type: 'step:start', message: 'Installing python from winget' }
      await execaCommand('winget install -e --id Python.Python.2 --silent')
      yield { type: 'step:done' }
      yield {
        type: 'info',
        message:
          'Python installed. Please close this window, launch a new Command Prompt, and re-run setup.',
      }
    } catch (error) {
      yield {
        type: 'step:fail',
        message: `Error installing Python: ${String(error)}`,
      }
    }
  }
}

export const nrf52Toolchain: Toolchain = {
  name: 'nrf52',
  platforms: ['mac', 'lin', 'win'],

  async *install(ctx: HostContext, prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    yield { type: 'step:start', message: 'Setting up nrf52 tools' }

    const isWindows = ctx.platform === 'win'
    const archKey = `${ctx.platform}_${ctx.arch}`
    const archAlias = ARCH_ALIAS[archKey]
    if (archAlias === undefined) {
      yield { type: 'step:fail', message: `Unsupported platform/arch combination for nrf52: ${archKey}` }
      return
    }
    const TOOLCHAIN = `arm-gnu-toolchain-12.2.rel1-${archAlias}-arm-none-eabi`
    const TOOLCHAIN_DOWNLOAD = `https://developer.arm.com/-/media/Files/downloads/gnu/12.2.rel1/binrel/${TOOLCHAIN}.${isWindows ? 'zip' : 'tar.xz'}`
    const ADAFRUIT_NRF52_BOOTLOADER_UF2CONV_DOWNLOAD =
      'https://github.com/Moddable-OpenSource/tools/releases/download/v1.0.0/uf2conv.py'
    const NRF5_SDK_DOWNLOAD = `https://github.com/Moddable-OpenSource/tools/releases/download/v1.0.0/${NRF5_SDK}-mod.zip`
    const NRF52_DIR = resolve(INSTALL_DIR, 'nrf52')
    const TOOLCHAIN_PATH = resolve(NRF52_DIR, TOOLCHAIN)
    const UF2CONV_PATH = resolve(NRF52_DIR, 'uf2conv.py')
    const NRF5_SDK_PATH = resolve(NRF52_DIR, NRF5_SDK)

    await sourceEnvironment()

    if (!moddableExists()) {
      yield {
        type: 'step:fail',
        message: `Moddable tooling required. Run 'xs-dev setup' before trying again.`,
      }
      return
    }

    let createUnxz: ((lzmaOption?: LZMAOptions, transformOption?: TransformOptions) => Unxz) = () => {
      return new Transform() as Unxz
    }
    if (!isWindows) {
      try {
        ;({ createUnxz } = await import('node-liblzma'))
      } catch (error) {
        yield {
          type: 'step:fail',
          message:
            'Unable to extract Arm Embedded Toolchain without XZ utils (https://tukaani.org/xz/). Please install that dependency on your system and reinstall xs-dev before attempting this setup again. See https://xs-dev.js.org/troubleshooting for more info.',
        }
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
      if (ctx.platform === 'mac' || ctx.platform === 'lin') {
        if (
          process.env.NRF_ROOT === undefined ||
          process.env.NRF_ROOT === '' ||
          process.env.NRF_SDK_DIR === undefined ||
          process.env.NRF_SDK_DIR === ''
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

      if (ctx.platform === 'lin') {
        try {
          const result = await execWithSudo('adduser $USER dialout')
          if (isFailure(result)) {
            yield {
              type: 'warning',
              message: `Unable to provide ttyUSB0 permission to the current user. Please run "sudo adduser <username> dialout" before trying to attempting to build projects for your nrf52 device.`,
            }
          }
        } catch (_error) {
          yield {
            type: 'warning',
            message: `Unable to provide ttyUSB0 permission to the current user. Please run "sudo adduser <username> dialout" before trying to attempting to build projects for your nrf52 device.`,
          }
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
  },

  async *update(_ctx: HostContext, _prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    yield { type: 'warning', message: 'nRF52 update is not currently supported' }
  },

  async *teardown(_ctx: HostContext, _prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    try {
      yield { type: 'step:start', message: 'Removing nrf52 tooling' }
      rmSync(join(INSTALL_DIR, 'nrf52'), { recursive: true, force: true })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error removing nrf52 tooling: ${String(error)}` }
    }
  },

  async verify(ctx: HostContext): Promise<VerifyResult> {
    const missing: string[] = []

    if (process.env.NRF_ROOT === undefined || process.env.NRF_ROOT === '') {
      missing.push('NRF_ROOT env var not set')
    } else if (!existsSync(process.env.NRF_ROOT)) {
      missing.push(`NRF_ROOT path does not exist: ${process.env.NRF_ROOT}`)
    }

    // Windows install sets NRF52_SDK_PATH; other platforms set NRF_SDK_DIR
    const sdkDir = ctx.platform === 'win' ? process.env.NRF52_SDK_PATH : process.env.NRF_SDK_DIR
    const sdkEnvName = ctx.platform === 'win' ? 'NRF52_SDK_PATH' : 'NRF_SDK_DIR'
    if (sdkDir === undefined || sdkDir === '') {
      missing.push(`${sdkEnvName} env var not set`)
    } else if (!existsSync(sdkDir)) {
      missing.push(`${sdkEnvName} path does not exist: ${sdkDir}`)
    }

    if (missing.length > 0) {
      return { ok: false, toolchain: 'nrf52', missing }
    }

    return { ok: true, toolchain: 'nrf52' }
  },

  getEnvVars(ctx: HostContext): Record<string, string> {
    const NRF52_DIR = resolve(INSTALL_DIR, 'nrf52')
    const sdkPath = resolve(NRF52_DIR, NRF5_SDK)
    return ctx.platform === 'win'
      ? { NRF_ROOT: NRF52_DIR, NRF52_SDK_PATH: sdkPath }
      : { NRF_ROOT: NRF52_DIR, NRF_SDK_DIR: sdkPath }
  },
}
