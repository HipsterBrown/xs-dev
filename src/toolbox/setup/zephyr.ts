import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { type as platformType } from 'node:os'
import { execaCommand } from 'execa'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from './constants.js'
import upsert from '../patching/upsert.js'
import { installDeps as installMacDeps } from './zephyr/mac.js'
import { installDeps as installLinuxDeps } from './zephyr/linux.js'
import { installDeps as installWinDeps } from './zephyr/windows.js'
import { moddableExists } from './moddable.js'
import { sourceEnvironment } from '../system/exec.js'
import { detectPython } from '../system/python.js'
import { setEnv } from './windows.js'
import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

export default async function* zephyrSetup(
  args: Record<string, unknown>,
  prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  yield { type: 'step:start', message: 'Starting zephyr tooling setup' }

  const OS = platformType().toLowerCase()
  const isWindows = OS === 'windows_nt'
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
    if (OS === 'darwin') {
      for await (const event of installMacDeps(prompter)) {
        yield event
      }
    }

    if (OS === 'linux') {
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
    if (process.env.ZEPHYR_BASE === undefined) {
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
}
