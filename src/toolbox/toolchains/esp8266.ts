import { mkdir, rename, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { finished } from 'node:stream'
import { promisify, debuglog } from 'node:util'
import { createGunzip } from 'node:zlib'
import { execaCommand } from 'execa'
import { extract } from 'tar-fs'
import { Extract as ZipExtract } from 'unzip-stream'
import { parallelMerge } from 'streaming-iterables'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from '../setup/constants.js'
import upsert from '../patching/upsert.js'
import { which } from '../system/exec.js'
import { fetchStream } from '../system/fetch.js'
import { ensureHomebrew } from '../setup/homebrew.js'
import { findMissingDependencies, installPackages } from '../system/packages.js'
import { isFailure } from '../system/errors.js'
import { addToPath, setEnv } from '../setup/windows.js'
import type { Dependency } from '../system/types.js'
import type { Toolchain, HostContext, VerifyResult } from './interface.js'
import type { OperationEvent } from '../../lib/events.js'
import type { Prompter } from '../../lib/prompter.js'

const debug = debuglog('xs-dev:toolchains:esp8266')
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
      yield { type: 'step:fail', message: `${error.message} python` }
    }
    return
  }

  if (which('python') === null) {
    const maybePython3Path = which('python3')

    if (maybePython3Path === null) {
      try {
        debug('Installing python from homebrew')
        await execaCommand('brew install python', { shell: process.env.SHELL ?? '/bin/bash' })
        debug('Python installed')
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
      debug('Installing pip through ensurepip')
      await execaCommand('python3 -m ensurepip --user', { shell: process.env.SHELL ?? '/bin/bash' })
      debug('pip installed')
    } catch (error: unknown) {
      yield { type: 'step:fail', message: `Error installing pip: ${String(error)}` }
      return
    }
  }

  try {
    debug('Installing pyserial through pip')
    await execaCommand('python3 -m pip install pyserial', { shell: process.env.SHELL ?? '/bin/bash' })
    debug('Pyserial installed')
  } catch (error: unknown) {
    yield { type: 'step:fail', message: `Error installing pyserial: ${String(error)}` }
  }
}

async function* installLinuxDeps(_prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
  debug('Installing python deps with apt-get')

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
    debug('Linux deps installed')
  } catch (error) {
    yield {
      type: 'step:fail',
      message: `Error installing esp8266 linux dependencies: ${String(error)}`,
    }
  }
}

async function* installWindowsDeps(_prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
  try {
    const ESP_DIR = INSTALL_DIR
    const ESP_TOOL_DIR = resolve(ESP_DIR, ESP_TOOL_VERSION)
    const ESP_TOOL_EXE = resolve(ESP_TOOL_DIR, 'esptool.exe')
    const ESP_TOOL_DESTINATION = resolve(ESP_DIR, 'esptool.exe')
    const CYGWIN_BIN = resolve(ESP_DIR, 'cygwin', 'bin')

    const esptoolInstall = async function(): Promise<void> {
      debug('Downloading ESP Tool')
      const writer = ZipExtract({ path: ESP_DIR })
      const download = await fetchStream(ESP_TOOL_URL)
      download.pipe(writer)
      await finishedPromise(writer)
      await rename(ESP_TOOL_EXE, ESP_TOOL_DESTINATION)
      await rm(ESP_TOOL_DIR, { recursive: true, force: true })
      debug('ESP Tool installed')
    }

    const cygwinInstall = async function(): Promise<void> {
      debug('Downloading Cygwin toolchain support package')
      const cygwinWriter = ZipExtract({ path: ESP_DIR })
      const cygwinDownload = await fetchStream(CYGWIN_URL)
      cygwinDownload.pipe(cygwinWriter)
      await finishedPromise(cygwinWriter)
      debug('Cygwin toolchain installed')
    }

    await Promise.all([esptoolInstall(), cygwinInstall()])

    debug('Setting environment variables')
    await setEnv('BASE_DIR', INSTALL_DIR)
    await addToPath(CYGWIN_BIN)
    debug('Environment variables set')

    if (which('python') === null) {
      try {
        await execaCommand('where winget')
      } catch (error) {
        yield {
          type: 'warning',
          message:
            'Python is required. You can download it from python.org/downloads or install via Windows Package Manager (winget).',
        }
        yield { type: 'step:fail', message: 'Python is required' }
        return
      }

      try {
        debug('Installing python from winget')
        await execaCommand('winget install -e --id Python.Python.3 --silent')
        debug('Python installed')
        yield {
          type: 'info',
          message:
            'Python installed. Please close this window, launch a new Command Prompt, and re-run setup.',
        }
        return
      } catch (error) {
        yield { type: 'step:fail', message: `Error installing Python: ${String(error)}` }
      }
    }

    if (which('pip') === null) {
      try {
        debug('Installing pip through ensurepip')
        await execaCommand('python -m ensurepip')
        debug('Pip installed')
      } catch (error) {
        yield { type: 'step:fail', message: `Error installing pip: ${String(error)}` }
      }
    }

    try {
      debug('Installing pyserial with pip')
      await execaCommand('python -m pip install pyserial')
      debug('Pyserial installed')
    } catch (error) {
      yield { type: 'step:fail', message: `Error installing pyserial: ${String(error)}` }
    }
  } catch (error) {
    yield {
      type: 'step:fail',
      message: `Error installing esp8266 dependencies: ${String(error)}`,
    }
  }
}

export const esp8266Toolchain: Toolchain = {
  name: 'esp8266',
  platforms: ['mac', 'lin', 'win'],

  async *install(ctx: HostContext, prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
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

    // 1. ensure ~/.local/share/esp directory
    try {
      debug('Ensuring esp8266 directory')
      await mkdir(ESP_DIR, { recursive: true })
    } catch (error) {
      yield { type: 'step:fail', message: `Error creating esp8266 directory: ${String(error)}` }
      return
    }

    // parallelize esp8266 tooling install / setup
    const xtensaToolchainTask = async function*(): AsyncGenerator<OperationEvent, void, undefined> {
      if (existsSync(TOOLCHAIN_PATH)) return
      try {
        debug('Downloading xtensa toolchain')

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
        debug('xtensa toolchain installed')
      } catch (error) {
        yield { type: 'step:fail', message: `Error downloading toolchain: ${String(error)}` }

      }
    }

    const arduinoCoreTask = async function*(): AsyncGenerator<OperationEvent, void, undefined> {
      if (existsSync(ARDUINO_CORE_PATH)) return
      try {
        debug('Downloading arduino core tooling')
        const writer = ZipExtract({ path: ESP_DIR })
        const download = await fetchStream(ARDUINO_CORE)
        download.pipe(writer)
        await finishedPromise(writer)
        debug('Arduino core tooling installed')
      } catch (error) {
        yield { type: 'step:fail', message: `Error downloading arduino core: ${String(error)}` }

      }
    }

    const rtosTask = async function*(): AsyncGenerator<OperationEvent, void, undefined> {
      if (existsSync(RTOS_PATH)) return
      try {
        debug('Cloning esp8266 RTOS SDK repo')
        await execaCommand(
          `git clone --depth 1 --single-branch -b ${ESP_BRANCH} ${ESP_RTOS_REPO} ${RTOS_PATH}`,
        )
        debug('esp8266 RTOS installed')
      } catch (error) {
        yield { type: 'step:fail', message: `Error cloning RTOS SDK: ${String(error)}` }

      }
    }

    const depsInstallTask = (() => {
      if (ctx.platform === 'mac') return installMacDeps
      if (ctx.platform === 'lin') return installLinuxDeps
      return installWindowsDeps
    })()

    let hasFailure = false
    const tasks = parallelMerge(xtensaToolchainTask(), arduinoCoreTask(), rtosTask(), depsInstallTask(prompter))
    yield { type: 'step:start', message: 'Installing ESP8266 toolchain and dependencies' }
    for await (const event of tasks) {
      if (event.type === 'step:fail') {
        hasFailure = true
      }
      yield event
    }

    if (hasFailure) {
      yield { type: 'step:fail', message: `Error installing ESP8266 toolchain` }
      return
    } else {
      yield { type: 'step:done', message: 'ESP8266 toolchian and deps installed successfully' }
    }

    // 6. create ESP_BASE env export in shell profile
    try {
      if (ctx.platform === 'mac' || ctx.platform === 'lin') {
        if (process.env.ESP_BASE === undefined || process.env.ESP_BASE === '') {
          debug('Configuring $ESP_BASE')
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

  async *update(_ctx: HostContext, _prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    yield { type: 'warning', message: 'ESP8266 update is not currently supported' }
  },

  async *teardown(_ctx: HostContext, _prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    try {
      debug('Removing esp8266 tooling')
      await rm(join(INSTALL_DIR, 'esp'), { recursive: true, force: true })
      debug('esp8266 toolchain removed')
    } catch (error) {
      yield { type: 'step:fail', message: `Error removing esp8266 tooling: ${String(error)}` }
    }
  },

  async verify(_ctx: HostContext): Promise<VerifyResult> {
    const missing: string[] = []

    if (process.env.ESP_BASE === undefined || process.env.ESP_BASE === '') {
      missing.push('ESP_BASE env var not set')
    } else if (!existsSync(process.env.ESP_BASE)) {
      missing.push(`ESP_BASE path does not exist: ${process.env.ESP_BASE}`)
    }

    if (missing.length > 0) {
      return { ok: false, toolchain: 'esp8266', missing }
    }

    return { ok: true, toolchain: 'esp8266' }
  },

  getEnvVars(_ctx: HostContext): Record<string, string> {
    return {
      ESP_BASE: resolve(INSTALL_DIR, 'esp'),
    }
  },
}
