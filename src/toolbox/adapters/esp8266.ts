import { mkdir } from 'node:fs/promises'
import { existsSync, rmSync, renameSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { finished } from 'node:stream'
import { promisify } from 'node:util'
import { execaCommand } from 'execa'
import { extract } from 'tar-fs'
import { createGunzip } from 'node:zlib'
import { Extract as ZipExtract } from 'unzip-stream'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from '../setup/constants.js'
import { moddableExists } from '../setup/moddable.js'
import upsert from '../patching/upsert.js'
import { sourceEnvironment, which } from '../system/exec.js'
import { fetchStream } from '../system/fetch.js'
import { ensureHomebrew } from '../setup/homebrew.js'
import { findMissingDependencies, installPackages } from '../system/packages.js'
import { isFailure } from '../system/errors.js'
import { addToPath, setEnv } from '../setup/windows.js'
import type { Dependency } from '../system/types.js'
import type { TargetAdapter, AdapterContext, VerifyResult } from './interface.js'
import type { OperationEvent } from '../../lib/events.js'
import type { Prompter } from '../../lib/prompter.js'

const finishedPromise = promisify(finished)

const ESP_TOOL_URL =
  'https://github.com/igrr/esptool-ck/releases/download/0.4.13/esptool-0.4.13-win32.zip'
const ESP_TOOL_VERSION = 'esptool-0.4.13-win32'
const CYGWIN_URL =
  'https://github.com/Moddable-OpenSource/tools/releases/download/v1.0.0/cygwin.win32.zip'

async function* installMacDeps(prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
  try {
    for await (const event of ensureHomebrew(prompter)) {
      yield event
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      yield { type: 'info', message: `${error.message} python` }
      yield { type: 'step:fail', message: `${error.message} python` }
    }
    return
  }

  if (which('python') === null) {
    const maybePython3Path = which('python3')

    if (maybePython3Path === null) {
      try {
        yield { type: 'step:start', message: 'Installing python from homebrew' }
        await execaCommand('brew install python', { shell: process.env.SHELL ?? '/bin/bash' })
        yield { type: 'step:done' }
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('xcode-select')) {
          yield {
            type: 'step:fail',
            message:
              'Apple Command Line Tools must be installed in order to install python from Homebrew. Please run `xcode-select --install` before trying again.',
          }
        } else {
          yield { type: 'step:fail', message: `Error installing python: ${String(error)}` }
        }
        return
      }
    }
  }

  if (which('pip') === null || which('pip3') === null) {
    try {
      yield { type: 'step:start', message: 'Installing pip through ensurepip' }
      await execaCommand('python3 -m ensurepip --user', { shell: process.env.SHELL ?? '/bin/bash' })
      yield { type: 'step:done' }
    } catch (error: unknown) {
      yield { type: 'step:fail', message: `Error installing pip: ${String(error)}` }
      return
    }
  }

  try {
    yield { type: 'step:start', message: 'Installing pyserial through pip' }
    await execaCommand('python3 -m pip install pyserial', { shell: process.env.SHELL ?? '/bin/bash' })
    yield { type: 'step:done' }
  } catch (error: unknown) {
    yield { type: 'warning', message: `Error installing pyserial: ${String(error)}` }
  }
}

async function* installLinuxDeps(_prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
  yield { type: 'step:start', message: 'Installing python deps with apt-get' }

  try {
    const dependencies: Dependency[] = [
      { name: 'pip', packageName: 'python-pip', type: 'binary' },
      { name: 'pyserial-miniterm', packageName: 'python3-serial', type: 'binary' },
      { name: 'python', packageName: 'python-is-python3', type: 'binary' },
    ]

    const missingDepsResult = await findMissingDependencies(dependencies)
    if (isFailure(missingDepsResult)) {
      yield { type: 'step:fail', message: `Error finding dependencies: ${missingDepsResult.error}` }
      return
    }

    if (missingDepsResult.data.length !== 0) {
      const result = await installPackages(missingDepsResult.data)
      if (isFailure(result)) {
        yield { type: 'step:fail', message: `Error installing dependencies: ${result.error}` }
        return
      }
    }
    yield { type: 'step:done' }
  } catch (error) {
    yield {
      type: 'step:fail',
      message: `Error installing esp8266 linux dependencies: ${String(error)}`,
    }
  }
}

async function* installWindowsDeps(prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
  try {
    const ESP_DIR = INSTALL_DIR
    const ESP_TOOL_DIR = resolve(ESP_DIR, ESP_TOOL_VERSION)
    const ESP_TOOL_EXE = resolve(ESP_TOOL_DIR, 'esptool.exe')
    const ESP_TOOL_DESTINATION = resolve(ESP_DIR, 'esptool.exe')
    const CYGWIN_BIN = resolve(ESP_DIR, 'cygwin', 'bin')

    yield { type: 'step:start', message: 'Downloading ESP Tool' }
    const writer = ZipExtract({ path: ESP_DIR })
    const download = await fetchStream(ESP_TOOL_URL)
    download.pipe(writer)
    await finishedPromise(writer)
    renameSync(ESP_TOOL_EXE, ESP_TOOL_DESTINATION)
    rmSync(ESP_TOOL_DIR, { recursive: true, force: true })
    yield { type: 'step:done' }

    yield { type: 'step:start', message: 'Downloading Cygwin toolchain support package' }
    const cygwinWriter = ZipExtract({ path: ESP_DIR })
    const cygwinDownload = await fetchStream(CYGWIN_URL)
    cygwinDownload.pipe(cygwinWriter)
    await finishedPromise(cygwinWriter)
    yield { type: 'step:done' }

    yield { type: 'step:start', message: 'Setting environment variables' }
    await setEnv('BASE_DIR', INSTALL_DIR)
    await addToPath(CYGWIN_BIN)
    yield { type: 'step:done' }

    if (which('python') === null) {
      try {
        await execaCommand('where winget')
      } catch (error) {
        yield {
          type: 'info',
          message:
            'Python is required. You can download it from python.org/downloads or install via Windows Package Manager (winget).',
        }
        yield {
          type: 'info',
          message:
            'Install winget from the Microsoft Store if needed, then re-run this setup.',
        }
        yield { type: 'step:fail', message: 'Python is required' }
        return
      }

      try {
        yield { type: 'step:start', message: 'Installing python from winget' }
        await execaCommand('winget install -e --id Python.Python.3 --silent')
        yield { type: 'step:done' }
        yield {
          type: 'info',
          message:
            'Python installed. Please close this window, launch a new Command Prompt, and re-run setup.',
        }
      } catch (error) {
        yield { type: 'step:fail', message: `Error installing Python: ${String(error)}` }
      }
    }

    if (which('pip') === null) {
      try {
        yield { type: 'step:start', message: 'Installing pip through ensurepip' }
        await execaCommand('python -m ensurepip')
        yield { type: 'step:done' }
      } catch (error) {
        yield { type: 'warning', message: `Error installing pip: ${String(error)}` }
      }
    }

    try {
      yield { type: 'step:start', message: 'Installing pyserial through pip' }
      await execaCommand('python -m pip install pyserial')
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'warning', message: `Error installing pyserial: ${String(error)}` }
    }
  } catch (error) {
    yield {
      type: 'step:fail',
      message: `Error installing esp8266 dependencies: ${String(error)}`,
    }
  }
}

export const esp8266Adapter: TargetAdapter = {
  name: 'esp8266',
  platforms: ['mac', 'lin', 'win'],

  async *install(ctx: AdapterContext, prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    yield { type: 'step:start', message: 'Setting up esp8266 tools' }

    const isWindows = ctx.platform === 'win'
    const TOOLCHAIN = `https://github.com/Moddable-OpenSource/tools/releases/download/v1.0.0/esp8266.toolchain.${isWindows ? 'win32' : ctx.platform === 'mac' ? 'darwin' : 'linux'}.${isWindows ? 'zip' : 'tgz'}`
    const ARDUINO_CORE =
      'https://github.com/esp8266/Arduino/releases/download/2.3.0/esp8266-2.3.0.zip'
    const ESP_RTOS_REPO = 'https://github.com/espressif/ESP8266_RTOS_SDK.git'
    const ESP_BRANCH = 'release/v3.2'
    const ESP_DIR = resolve(INSTALL_DIR, 'esp')
    const RTOS_PATH = resolve(ESP_DIR, 'ESP8266_RTOS_SDK')
    const TOOLCHAIN_PATH = resolve(ESP_DIR, 'toolchain')
    const ARDUINO_CORE_PATH = resolve(ESP_DIR, 'esp8266-2.3.0')

    await sourceEnvironment()

    // 0. ensure Moddable exists
    if (!moddableExists()) {
      yield {
        type: 'step:fail',
        message: `Moddable tooling required. Run 'xs-dev setup' before trying again.`,
      }
      return
    }

    // 1. ensure ~/.local/share/esp directory
    try {
      yield { type: 'info', message: 'Ensuring esp8266 directory' }
      await mkdir(ESP_DIR, { recursive: true })
    } catch (error) {
      yield { type: 'step:fail', message: `Error creating esp8266 directory: ${String(error)}` }
      return
    }

    // 2. download and untar xtensa toolchain
    if (!existsSync(TOOLCHAIN_PATH)) {
      try {
        yield { type: 'step:start', message: 'Downloading xtensa toolchain' }

        if (isWindows) {
          const writer = ZipExtract({ path: ESP_DIR })
          const download = await fetchStream(TOOLCHAIN)
          download.pipe(writer)
          await finishedPromise(writer)
        } else {
          const writer = extract(ESP_DIR, { readable: true })
          const gunzip = createGunzip()
          const download = await fetchStream(TOOLCHAIN)
          download.pipe(gunzip).pipe(writer)
          await finishedPromise(writer)
        }
        yield { type: 'step:done' }
      } catch (error) {
        yield { type: 'step:fail', message: `Error downloading toolchain: ${String(error)}` }
        return
      }
    }

    // 3. download and unzip esp8266 core for arduino
    if (!existsSync(ARDUINO_CORE_PATH)) {
      try {
        yield { type: 'step:start', message: 'Downloading arduino core tooling' }
        const writer = ZipExtract({ path: ESP_DIR })
        const download = await fetchStream(ARDUINO_CORE)
        download.pipe(writer)
        await finishedPromise(writer)
        yield { type: 'step:done' }
      } catch (error) {
        yield { type: 'step:fail', message: `Error downloading arduino core: ${String(error)}` }
        return
      }
    }

    // 4. clone esp8266 RTOS SDK
    if (!existsSync(RTOS_PATH)) {
      try {
        yield { type: 'step:start', message: 'Cloning esp8266 RTOS SDK repo' }
        await execaCommand(
          `git clone --depth 1 --single-branch -b ${ESP_BRANCH} ${ESP_RTOS_REPO} ${RTOS_PATH}`,
        )
        yield { type: 'step:done' }
      } catch (error) {
        yield { type: 'step:fail', message: `Error cloning RTOS SDK: ${String(error)}` }
        return
      }
    }

    // 5. ensure python, pip, and pyserial are installed
    try {
      if (ctx.platform === 'mac') {
        for await (const event of installMacDeps(prompter)) {
          yield event
        }
      }

      if (ctx.platform === 'lin') {
        for await (const event of installLinuxDeps(prompter)) {
          yield event
        }
      }

      if (ctx.platform === 'win') {
        for await (const event of installWindowsDeps(prompter)) {
          yield event
        }
      }
    } catch (error) {
      yield {
        type: 'step:fail',
        message: `Dependencies failed to install. Please review the information above.`,
      }
      return
    }

    // 6. create ESP_BASE env export in shell profile
    try {
      if (ctx.platform === 'mac' || ctx.platform === 'lin') {
        if (process.env.ESP_BASE === undefined || process.env.ESP_BASE === '') {
          yield { type: 'info', message: 'Configuring $ESP_BASE' }
          process.env.ESP_BASE = ESP_DIR
          await upsert(EXPORTS_FILE_PATH, `export ESP_BASE=${process.env.ESP_BASE}`)
        }
      }
    } catch (error) {
      yield { type: 'step:fail', message: `Error configuring ESP_BASE: ${String(error)}` }
      return
    }

    yield {
      type: 'step:done',
      message: `Successfully set up esp8266 platform support for Moddable!
Test out the setup by starting a new ${isWindows ? 'Moddable Command Prompt' : 'terminal session'}, plugging in your device, and running: xs-dev run --example helloworld --device esp8266
If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the "/dev.cu.*" that matches your device.`,
    }
  },

  async *update(_ctx: AdapterContext, _prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    yield { type: 'warning', message: 'ESP8266 update is not currently supported' }
  },

  async *teardown(_ctx: AdapterContext, _prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    try {
      yield { type: 'step:start', message: 'Removing esp8266 tooling' }
      rmSync(join(INSTALL_DIR, 'esp'), { recursive: true, force: true })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error removing esp8266 tooling: ${String(error)}` }
    }
  },

  async verify(_ctx: AdapterContext): Promise<VerifyResult> {
    const missing: string[] = []

    if (process.env.ESP_BASE === undefined || process.env.ESP_BASE === '') {
      missing.push('ESP_BASE env var not set')
    } else if (!existsSync(process.env.ESP_BASE)) {
      missing.push(`ESP_BASE path does not exist: ${process.env.ESP_BASE}`)
    }

    if (missing.length > 0) {
      return { ok: false, adapter: 'esp8266', missing }
    }

    return { ok: true, adapter: 'esp8266' }
  },

  getEnvVars(_ctx: AdapterContext): Record<string, string> {
    return {
      ESP_BASE: resolve(INSTALL_DIR, 'esp'),
    }
  },
}
