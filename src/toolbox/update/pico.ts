import { type as platformType } from 'node:os'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { execaCommand } from 'execa'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from '../setup/constants'
import upsert from '../patching/upsert'
import { installDeps as installMacDeps } from '../setup/pico/mac'
import { installDeps as installLinuxDeps } from '../setup/pico/linux'
import { moddableExists } from '../setup/moddable'
import { sourceEnvironment } from '../system/exec'
import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

export default async function* updatePico(
  _args: Record<string, unknown>,
  _prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  const OS = platformType().toLowerCase()
  const PICO_BRANCH = '2.0.0'
  const PICO_ROOT =
    process.env.PICO_ROOT ?? resolve(INSTALL_DIR, 'pico')
  const PICO_SDK_DIR = resolve(PICO_ROOT, 'pico-sdk')
  const PICO_EXTRAS_DIR = resolve(PICO_ROOT, 'pico-extras')
  const PICO_EXAMPLES_PATH = resolve(PICO_ROOT, 'pico-examples')
  const PICOTOOL_PATH = resolve(PICO_ROOT, 'picotool')
  const PICOTOOL_BUILD_DIR = resolve(PICOTOOL_PATH, 'build')
  const PICO_SDK_BUILD_DIR = resolve(PICO_SDK_DIR, 'build')

  await sourceEnvironment()

  yield { type: 'step:start', message: 'Starting pico tooling update' }

  // 0. ensure pico install directory and Moddable exists
  if (!moddableExists()) {
    yield {
      type: 'step:fail',
      message: 'Moddable platform tooling required. Run `xs-dev setup` before trying again.',
    }
    return
  }

  yield { type: 'info', message: 'Ensuring pico directory' }
  if (
    !existsSync(PICO_ROOT) ||
    !existsSync(PICO_SDK_DIR) ||
    !existsSync(PICO_EXTRAS_DIR) ||
    !existsSync(PICO_EXAMPLES_PATH) ||
    !existsSync(PICOTOOL_PATH)
  ) {
    yield {
      type: 'step:fail',
      message: 'Pico tooling required. Run `xs-dev setup --device pico` before trying again.',
    }
    return
  } else {
    yield { type: 'step:done', message: 'Found existing pico tooling!' }
  }

  // 1. Install required components
  try {
    if (OS === 'darwin') {
      const cmakeCheck = await execaCommand('which cmake', { reject: false })
      if (cmakeCheck.exitCode !== 0) {
        yield { type: 'step:start', message: 'Cmake required, installing with Homebrew' }
        await execaCommand('brew install cmake')
        yield { type: 'step:done' }
      }

      for await (const event of installMacDeps()) {
        yield event
      }

      const brewPrefixResult = await execaCommand('brew --prefix')
      const brewPrefix = brewPrefixResult.stdout.trim()
      process.env.PICO_GCC_ROOT = brewPrefix
      await upsert(EXPORTS_FILE_PATH, `export PICO_GCC_ROOT=${brewPrefix}`)
    }

    if (OS === 'linux') {
      yield { type: 'step:start', message: 'Installing build dependencies with apt' }
      for await (const event of installLinuxDeps()) {
        yield event
      }
      process.env.PICO_GCC_ROOT = '/usr'
      await upsert(EXPORTS_FILE_PATH, `export PICO_GCC_ROOT=/usr`)
      yield { type: 'step:done' }
    }
  } catch (error) {
    yield { type: 'step:fail', message: `Error installing dependencies: ${String(error)}` }
    return
  }

  // 2. Update the pico sdk, extras, examples, and picotool:
  try {
    if (existsSync(PICO_SDK_DIR)) {
      yield { type: 'step:start', message: 'Updating pico-sdk repo' }
      await execaCommand('git fetch --all --tags', { cwd: PICO_SDK_DIR })
      await execaCommand(`git checkout ${PICO_BRANCH}`, { cwd: PICO_SDK_DIR })
      await execaCommand('git submodule update --init --recursive', {
        cwd: PICO_SDK_DIR,
      })
      yield { type: 'step:done' }
    }

    if (existsSync(PICO_EXTRAS_DIR)) {
      yield { type: 'step:start', message: 'Updating pico-extras repo' }
      await execaCommand('git fetch --all --tags', { cwd: PICO_EXTRAS_DIR })
      await execaCommand(`git checkout sdk-${PICO_BRANCH}`, {
        cwd: PICO_EXTRAS_DIR,
      })
      yield { type: 'step:done' }
    }

    if (existsSync(PICO_EXAMPLES_PATH)) {
      yield { type: 'step:start', message: 'Updating pico-examples repo' }
      await execaCommand('git fetch --all --tags', { cwd: PICO_EXAMPLES_PATH })
      await execaCommand(`git checkout sdk-${PICO_BRANCH}`, {
        cwd: PICO_EXAMPLES_PATH,
      })
      yield { type: 'step:done' }
    }

    if (existsSync(PICOTOOL_PATH)) {
      yield { type: 'step:start', message: 'Updating picotool repo' }
      await execaCommand('git fetch --all --tags', { cwd: PICOTOOL_PATH })
      await execaCommand('git checkout master', { cwd: PICOTOOL_PATH })
      yield { type: 'step:done' }
    }

    // 4. Build some pico tools:
    yield { type: 'step:start', message: 'Building pico tools' }
    const { mkdir } = await import('node:fs/promises')
    await mkdir(PICO_SDK_BUILD_DIR, { recursive: true })
    await execaCommand('cmake ..', {
      shell: process.env.SHELL,
      stdio: 'inherit',
      cwd: PICO_SDK_BUILD_DIR,
    })
    await execaCommand('make', {
      shell: process.env.SHELL,
      stdio: 'inherit',
      cwd: PICO_SDK_BUILD_DIR,
    })
    yield { type: 'step:done' }

    // 5. Build _the_ picotool
    yield { type: 'step:start', message: 'Building the picotool CLI' }
    await mkdir(PICOTOOL_BUILD_DIR, { recursive: true })
    await execaCommand('cmake ..', {
      shell: process.env.SHELL,
      stdio: 'inherit',
      cwd: PICOTOOL_BUILD_DIR,
    })
    await execaCommand('make', {
      shell: process.env.SHELL,
      stdio: 'inherit',
      cwd: PICOTOOL_BUILD_DIR,
    })
    yield { type: 'step:done' }

    yield {
      type: 'step:done',
      message: `Successfully updated pico platform support for Moddable!
Test out the update by starting a new terminal session and putting the device into programming mode by holding the BOOTSEL button when powering on the Pico
Then run: xs-dev run --example helloworld --device pico`,
    }
  } catch (error) {
    yield { type: 'step:fail', message: `Error during pico update: ${String(error)}` }
  }
}
