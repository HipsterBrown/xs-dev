import { existsSync, rmSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { execaCommand } from 'execa'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from '../setup/constants.js'
import { moddableExists } from '../setup/moddable.js'
import { ensureHomebrew } from '../setup/homebrew.js'
import { execWithSudo, sourceEnvironment } from '../system/exec.js'
import { isFailure } from '../system/errors.js'
import { detectPython } from '../system/python.js'
import { setEnv } from '../setup/windows.js'
import upsert from '../patching/upsert.js'
import type { TargetAdapter, AdapterContext, VerifyResult } from './interface.js'
import type { OperationEvent } from '../../lib/events.js'
import type { Prompter } from '../../lib/prompter.js'

async function* installMacDeps(prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
  try {
    for await (const event of ensureHomebrew(prompter)) {
      yield event
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      yield { type: 'info', message: `${error.message} cmake, ninja, gperf, python3, python-tk, ccache, qemu, dtc, libmagic, wget, openocd` }
      yield { type: 'step:fail', message: `${error.message} cmake, ninja, gperf, python3, python-tk, ccache, qemu, dtc, libmagic, wget, openocd` }
    }
    return
  }

  try {
    yield { type: 'step:start', message: 'Installing zephyr dependencies' }
    await execaCommand('brew install cmake ninja gperf python3 python-tk ccache qemu dtc libmagic wget openocd', {
      shell: process.env.SHELL ?? '/bin/bash',
    })
    yield { type: 'step:done' }
  } catch (error: unknown) {
    yield { type: 'step:fail', message: `Error installing zephyr dependencies: ${String(error)}` }
  }
}

async function* installLinuxDeps(_prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
  try {
    yield { type: 'step:start', message: 'Installing zephyr dependencies' }
    const result = await execWithSudo(
      `apt-get install --yes \
cmake gcc-arm-none-eabi libnewlib-arm-none-eabi build-essential libusb-1.0.0-dev pkg-config \
xz-utils file make gcc gcc-multilib g++-multilib libsdl2-dev libmagic1`,
      { stdio: 'inherit' },
    )
    if (isFailure(result)) {
      yield { type: 'step:fail', message: `Error installing dependencies: ${result.error}` }
      return
    }
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error installing zephyr linux dependencies: ${String(error)}` }
  }
}

async function* installWinDeps(_prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
  yield { type: 'step:start', message: 'Installing Zephyr dependencies' }

  try {
    await execaCommand('where winget')
  } catch (error) {
    yield {
      type: 'info',
      message:
        'winget is required to install Zephyr dependencies. You can install it via the App Installer package in the Microsoft Store.',
    }
    yield {
      type: 'step:fail',
      message: 'winget is required to install dependencies for Zephyr tooling.',
    }
    return
  }

  try {
    await execaCommand(
      'winget install Kitware.CMake Ninja-build.Ninja oss-winget.gperf Python.Python.3.12 Git.Git oss-winget.dtc wget 7zip.7zip',
      { stdio: 'inherit', shell: true },
    )
    yield { type: 'step:done' }
  } catch (error) {
    yield {
      type: 'step:fail',
      message: `Error installing Zephyr dependencies: ${String(error)}`,
    }
  }
}

export const zephyrAdapter: TargetAdapter = {
  name: 'zephyr',
  platforms: ['mac', 'lin', 'win'],

  async *install(ctx: AdapterContext, prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    yield { type: 'step:start', message: 'Starting zephyr tooling setup' }

    const isWindows = ctx.platform === 'win'
    const ZEPHYR_ROOT =
      process.env.ZEPHYR_ROOT ?? resolve(INSTALL_DIR, 'zephyrproject')
    const ZEPHYR_BASE =
      process.env.ZEPHYR_BASE ?? resolve(ZEPHYR_ROOT, 'zephyr')
    const ZEPHYR_VENV = resolve(ZEPHYR_ROOT, '.venv')
    const ZEPHYR_VENV_ACTIVATE = resolve(ZEPHYR_VENV, 'bin', 'activate')

    await sourceEnvironment()

    // 0. ensure zephyr install directory and Moddable exists
    if (!moddableExists()) {
      yield { type: 'step:fail', message: 'Moddable platform tooling required. Run `xs-dev setup` before trying again.' }
      return
    }

    try {
      yield { type: 'info', message: 'Ensuring zephyr directory' }
      await mkdir(ZEPHYR_ROOT, { recursive: true })
    } catch (error) {
      yield { type: 'step:fail', message: `Error creating zephyr directory: ${String(error)}` }
      return
    }

    // 1. Install required components
    try {
      if (ctx.platform === 'mac') {
        for await (const event of installMacDeps(prompter)) {
          yield event
        }
      }

      if (ctx.platform === 'lin') {
        yield { type: 'step:start', message: 'Installing dependencies with apt' }
        for await (const event of installLinuxDeps(prompter)) {
          yield event
        }
      }

      if (isWindows) {
        yield { type: 'step:start', message: 'Installing dependencies with winget' }
        for await (const event of installWinDeps(prompter)) {
          yield event
        }
      }
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error installing dependencies: ${String(error)}` }
      return
    }

    // 2. Create zephyr virtual environment
    try {
      if (!existsSync(ZEPHYR_VENV)) {
        yield { type: 'step:start', message: 'Creating zephyr virtual environment' }
        const localPython = detectPython()
        await execaCommand(
          `${localPython} -m venv ${ZEPHYR_VENV}`,
          { stdio: 'inherit' },
        )
        yield { type: 'step:done' }
      }
    } catch (error) {
      yield { type: 'step:fail', message: `Error creating virtual environment: ${String(error)}` }
      return
    }

    // 3. Activate virtual environment
    try {
      if (isWindows) {
        await upsert(
          EXPORTS_FILE_PATH,
          `call "${ZEPHYR_ROOT}\\.venv\\Scripts\\activate.bat"`,
        )
        await execaCommand(`${ZEPHYR_ROOT}\\.venv\\Scripts\\activate.bat`, {
          stdio: 'inherit',
          shell: true,
        })
      } else {
        await upsert(EXPORTS_FILE_PATH, `source ${ZEPHYR_VENV_ACTIVATE}`)
      }
      await sourceEnvironment()
    } catch (error) {
      yield { type: 'step:fail', message: `Error activating virtual environment: ${String(error)}` }
      return
    }

    // 4. Install West with pip
    try {
      yield { type: 'step:start', message: 'Installing west build tool' }
      await execaCommand(`pip install west`, {
        shell: process.env.SHELL ?? '/bin/bash',
        stdio: 'inherit',
      })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error installing west: ${String(error)}` }
      return
    }

    // 5. Install west build tools
    try {
      yield { type: 'step:start', message: `Initializing west tooling in ${ZEPHYR_ROOT}` }
      await execaCommand(`west init ${ZEPHYR_ROOT}`, {
        shell: process.env.SHELL ?? '/bin/bash',
        stdio: 'inherit',
      })
      await execaCommand(`west update`, {
        cwd: ZEPHYR_ROOT,
        shell: process.env.SHELL ?? '/bin/bash',
        stdio: 'inherit',
      })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error initializing west: ${String(error)}` }
      return
    }

    // 6. Install west packages
    try {
      yield { type: 'step:start', message: `Installing west packages` }
      if (isWindows) {
        await execaCommand(`cmd /c zephyr\\scripts\\utils\\west-packages-pip-install.cmd`, {
          cwd: ZEPHYR_ROOT,
          shell: process.env.SHELL ?? 'cmd.exe',
          stdio: 'inherit',
        })
      } else {
        await execaCommand(`west packages pip --install`, {
          cwd: ZEPHYR_ROOT,
          shell: process.env.SHELL ?? '/bin/bash',
          stdio: 'inherit',
        })
      }
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error installing west packages: ${String(error)}` }
      return
    }

    // 7. Install Zephyr SDK
    try {
      yield { type: 'step:start', message: `Installing Zephyr SDK in ${ZEPHYR_BASE}` }
      await execaCommand(`west sdk install`, {
        cwd: ZEPHYR_BASE,
        shell: process.env.SHELL ?? '/bin/bash',
        stdio: 'inherit',
      })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error installing Zephyr SDK: ${String(error)}` }
      return
    }

    try {
      if (process.env.ZEPHYR_BASE === undefined || process.env.ZEPHYR_BASE === '') {
        if (isWindows) {
          await setEnv('ZEPHYR_BASE', ZEPHYR_BASE)
        } else {
          await upsert(EXPORTS_FILE_PATH, `export ZEPHYR_BASE=${ZEPHYR_BASE}`)
        }
      }
    } catch (error) {
      yield { type: 'step:fail', message: `Error setting environment variables: ${String(error)}` }
      return
    }

    yield {
      type: 'step:done',
      message: `Successfully set up zephyr platform support for Moddable!
Test out the setup by starting a new terminal session,
Then run: xs-dev run --example helloworld --device zephyr/<board_name>`,
    }
  },

  async *update(_ctx: AdapterContext, _prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    yield { type: 'warning', message: 'Zephyr update is not currently supported' }
  },

  async *teardown(_ctx: AdapterContext, _prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    try {
      yield { type: 'step:start', message: 'Removing zephyr tooling' }
      rmSync(join(INSTALL_DIR, 'zephyrproject'), { recursive: true, force: true })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error removing zephyr tooling: ${String(error)}` }
    }
  },

  async verify(_ctx: AdapterContext): Promise<VerifyResult> {
    const missing: string[] = []

    if (process.env.ZEPHYR_BASE === undefined || process.env.ZEPHYR_BASE === '') {
      missing.push('ZEPHYR_BASE env var not set')
    } else if (!existsSync(process.env.ZEPHYR_BASE)) {
      missing.push(`ZEPHYR_BASE path does not exist: ${process.env.ZEPHYR_BASE}`)
    }

    if (missing.length > 0) {
      return { ok: false, adapter: 'zephyr', missing }
    }

    return { ok: true, adapter: 'zephyr' }
  },

  getEnvVars(_ctx: AdapterContext): Record<string, string> {
    const ZEPHYR_ROOT = resolve(INSTALL_DIR, 'zephyrproject')
    return {
      ZEPHYR_BASE: resolve(ZEPHYR_ROOT, 'zephyr'),
    }
  },

  getActivationScript(_ctx: AdapterContext): string | null {
    const ZEPHYR_ROOT = process.env.ZEPHYR_ROOT ?? resolve(INSTALL_DIR, 'zephyrproject')
    const venvActivate = resolve(ZEPHYR_ROOT, '.venv', 'bin', 'activate')
    return existsSync(venvActivate) ? venvActivate : null
  },
}
