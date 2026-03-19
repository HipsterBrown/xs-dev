import { mkdir, readdir } from 'node:fs/promises'
import { existsSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { execaCommand } from 'execa'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from '../setup/constants.js'
import upsert from '../patching/upsert.js'
import { moddableExists } from '../setup/moddable.js'
import { sourceEnvironment, which, execWithSudo } from '../system/exec.js'
import { ensureHomebrew, formulaeExists } from '../setup/homebrew.js'
import { isFailure } from '../system/errors.js'
import type { Toolchain, HostContext, VerifyResult } from './interface.js'
import type { OperationEvent } from '../../lib/events.js'
import type { Prompter } from '../../lib/prompter.js'

async function* installMacDeps(prompter: Prompter): AsyncGenerator<OperationEvent> {
  try {
    for await (const event of ensureHomebrew(prompter)) {
      yield event
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      yield { type: 'info', message: `${error.message} gcc-arm-embedded, libusb, pkg-config` }
      yield { type: 'step:fail', message: `${error.message} gcc-arm-embedded, libusb, pkg-config` }
    }
    return
  }

  if (
    which('arm-none-eabi-gcc') !== null &&
    (await formulaeExists('arm-none-eabi-gcc'))
  ) {
    try {
      yield { type: 'step:start', message: 'Removing outdated arm gcc dependency' }
      await execaCommand('brew untap ArmMbed/homebrew-formulae', { shell: process.env.SHELL ?? '/bin/bash' })
      await execaCommand('brew uninstall arm-none-eabi-gcc', { shell: process.env.SHELL ?? '/bin/bash' })
      yield { type: 'step:done' }
    } catch (error: unknown) {
      yield { type: 'warning', message: `Error removing outdated gcc: ${String(error)}` }
    }
  }

  try {
    yield { type: 'step:start', message: 'Installing pico tools dependencies' }
    await execaCommand('brew install libusb pkg-config', {
      shell: process.env.SHELL ?? '/bin/bash',
    })
    await execaCommand('brew install --cask gcc-arm-embedded', {
      shell: process.env.SHELL ?? '/bin/bash',
    })
    yield { type: 'step:done' }
  } catch (error: unknown) {
    yield { type: 'step:fail', message: `Error installing pico dependencies: ${String(error)}` }
  }
}

async function* installLinuxDeps(_prompter: Prompter): AsyncGenerator<OperationEvent> {
  try {
    yield { type: 'step:start', message: 'Installing pico build dependencies' }
    const result = await execWithSudo(
      'apt-get install --yes cmake gcc-arm-none-eabi libnewlib-arm-none-eabi build-essential libusb-1.0.0-dev pkg-config',
      { stdio: 'inherit' },
    )
    if (isFailure(result)) {
      yield { type: 'step:fail', message: `Error installing dependencies: ${result.error}` }
      return
    }
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error installing pico linux dependencies: ${String(error)}` }
  }
}

export const picoToolchain: Toolchain = {
  name: 'pico',
  platforms: ['mac', 'lin', 'win'],

  async *install(ctx: HostContext, prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    yield { type: 'step:start', message: 'Starting pico tooling setup' }

    const PICO_BRANCH = '2.0.0'
    const PICO_SDK_REPO = 'https://github.com/raspberrypi/pico-sdk'
    const PICO_EXTRAS_REPO = 'https://github.com/raspberrypi/pico-extras'
    const PICO_EXAMPLES_REPO = 'https://github.com/raspberrypi/pico-examples'
    const PICOTOOL_REPO = 'https://github.com/raspberrypi/picotool'
    const PICO_ROOT = process.env.PICO_ROOT ?? resolve(INSTALL_DIR, 'pico')
    const PICO_SDK_DIR = resolve(PICO_ROOT, 'pico-sdk')
    const PICO_EXTRAS_DIR = resolve(PICO_ROOT, 'pico-extras')
    const PICO_EXAMPLES_PATH = resolve(PICO_ROOT, 'pico-examples')
    const PICOTOOL_PATH = resolve(PICO_ROOT, 'picotool')
    const PICOTOOL_BUILD_DIR = resolve(PICOTOOL_PATH, 'build')
    const PICO_SDK_BUILD_DIR = resolve(PICO_SDK_DIR, 'build')
    const PIOASM_TOOL_PATH = resolve(PICO_SDK_DIR, 'tools', 'pioasm')
    const PIOASM_BUILD_PATH = resolve(PICO_SDK_BUILD_DIR, 'pioasm')
    const PIOASM_PATH = resolve(PIOASM_BUILD_PATH, 'pioasm')

    await sourceEnvironment()

    // 0. ensure pico install directory and Moddable exists
    if (!moddableExists()) {
      yield { type: 'step:fail', message: 'Moddable platform tooling required. Run `xs-dev setup` before trying again.' }
      return
    }
    try {
      yield { type: 'info', message: 'Ensuring pico directory' }
      await mkdir(PICO_ROOT, { recursive: true })
      if (process.env.PICO_ROOT === undefined) {
        await upsert(EXPORTS_FILE_PATH, `export PICO_ROOT=${PICO_ROOT}`)
      }
    } catch (error) {
      yield { type: 'step:fail', message: `Error creating pico directory: ${String(error)}` }
      return
    }

    // 1. Install required components
    try {
      if (ctx.platform === 'mac') {
        if (which('cmake') === null) {
          yield { type: 'step:start', message: 'Cmake required, installing with Homebrew' }
          await execaCommand('brew install cmake')
          yield { type: 'step:done' }
        }

        for await (const event of installMacDeps(prompter)) {
          yield event
        }

        const brewPrefixResult = await execaCommand('brew --prefix', { stdio: 'pipe' })
        const brewPrefix = String(brewPrefixResult.stdout).trim()
        process.env.PICO_GCC_ROOT = brewPrefix
        await upsert(EXPORTS_FILE_PATH, `export PICO_GCC_ROOT=${brewPrefix}`)
      }

      if (ctx.platform === 'lin') {
        yield { type: 'step:start', message: 'Installing build dependencies with apt' }
        for await (const event of installLinuxDeps(prompter)) {
          yield event
        }
        process.env.PICO_GCC_ROOT = '/usr'
        await upsert(EXPORTS_FILE_PATH, `export PICO_GCC_ROOT=/usr`)
      }
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error during dependency installation: ${String(error)}` }
      return
    }

    // 2. Install the pico sdk, extras, examples, and picotool:
    try {
      if (!existsSync(PICO_SDK_DIR)) {
        yield { type: 'step:start', message: 'Cloning pico-sdk repo' }
        await execaCommand(
          `git clone --depth 1 --single-branch -b ${PICO_BRANCH} ${PICO_SDK_REPO} ${PICO_SDK_DIR}`,
          { stdio: 'inherit' },
        )
        await execaCommand(`git submodule update --init`, {
          cwd: PICO_SDK_DIR,
          stdio: 'inherit',
        })
        yield { type: 'step:done' }
      }

      if (!existsSync(PICO_EXTRAS_DIR)) {
        yield { type: 'step:start', message: 'Cloning pico-extras repo' }
        await execaCommand(
          `git clone --depth 1 --single-branch -b sdk-${PICO_BRANCH} ${PICO_EXTRAS_REPO} ${PICO_EXTRAS_DIR}`,
          { stdio: 'inherit' },
        )
        yield { type: 'step:done' }
      }

      if (!existsSync(PICO_EXAMPLES_PATH)) {
        yield { type: 'step:start', message: 'Cloning pico-examples repo' }
        await execaCommand(
          `git clone --depth 1 --single-branch -b sdk-${PICO_BRANCH} ${PICO_EXAMPLES_REPO} ${PICO_EXAMPLES_PATH}`,
          { stdio: 'inherit' },
        )
        yield { type: 'step:done' }
      }

      if (!existsSync(PICOTOOL_PATH)) {
        yield { type: 'step:start', message: 'Cloning picotool repo' }
        await execaCommand(
          `git clone --depth 1 --single-branch -b ${PICO_BRANCH} ${PICOTOOL_REPO} ${PICOTOOL_PATH}`,
          { stdio: 'inherit' },
        )
        yield { type: 'step:done' }
      }
    } catch (error) {
      yield { type: 'step:fail', message: `Error cloning repositories: ${String(error)}` }
      return
    }

    // 3. Set the PICO_SDK_PATH and related environment variables
    try {
      if (process.env.PICO_SDK_DIR === undefined) {
        yield { type: 'info', message: 'Setting PICO_SDK_DIR' }
        process.env.PICO_SDK_DIR = PICO_SDK_DIR
        await upsert(EXPORTS_FILE_PATH, `export PICO_SDK_DIR=${PICO_SDK_DIR}`)
      } else {
        yield { type: 'info', message: `Using existing $PICO_SDK_DIR: ${process.env.PICO_SDK_DIR}` }
      }

      if (process.env.PICO_EXTRAS_DIR === undefined) {
        yield { type: 'info', message: 'Setting PICO_EXTRAS_DIR' }
        process.env.PICO_EXTRAS_DIR = PICO_EXTRAS_DIR
        await upsert(EXPORTS_FILE_PATH, `export PICO_EXTRAS_DIR=${PICO_EXTRAS_DIR}`)
      } else {
        yield { type: 'info', message: `Using existing $PICO_EXTRAS_DIR: ${process.env.PICO_EXTRAS_DIR}` }
      }

      if (process.env.PICO_EXAMPLES_DIR === undefined) {
        yield { type: 'info', message: 'Setting PICO_EXAMPLES_DIR' }
        process.env.PICO_EXAMPLES_DIR = PICO_EXAMPLES_PATH
        await upsert(
          EXPORTS_FILE_PATH,
          `export PICO_EXAMPLES_DIR=${PICO_EXAMPLES_PATH}`,
        )
      } else {
        yield { type: 'info', message: `Using existing $PICO_EXAMPLES_DIR: ${process.env.PICO_EXAMPLES_DIR}` }
      }
    } catch (error) {
      yield { type: 'step:fail', message: `Error setting environment variables: ${String(error)}` }
      return
    }

    // 4. Build some pico tools:
    try {
      const shouldBuildPico = !existsSync(PICO_SDK_BUILD_DIR) ||
        (await readdir(PICO_SDK_BUILD_DIR).catch(() => [])).length === 0

      if (shouldBuildPico) {
        yield { type: 'step:start', message: 'Build some pico tools' }
        await mkdir(PICO_SDK_BUILD_DIR, { recursive: true })
        await execaCommand('cmake ..', {
          shell: process.env.SHELL ?? '/bin/bash',
          stdio: 'inherit',
          cwd: PICO_SDK_BUILD_DIR,
        })
        await execaCommand('make', {
          shell: process.env.SHELL ?? '/bin/bash',
          stdio: 'inherit',
          cwd: PICO_SDK_BUILD_DIR,
        })

        // Build pioasm
        await mkdir(PIOASM_BUILD_PATH, { recursive: true })
        await execaCommand(`cmake ${PIOASM_TOOL_PATH}`, {
          shell: process.env.SHELL ?? '/bin/bash',
          stdio: 'inherit',
          cwd: PIOASM_BUILD_PATH,
        })
        await execaCommand('make', {
          shell: process.env.SHELL ?? '/bin/bash',
          stdio: 'inherit',
          cwd: PIOASM_BUILD_PATH,
        })

        yield { type: 'step:done' }
      }
    } catch (error) {
      yield { type: 'step:fail', message: `Error building pico tools: ${String(error)}` }
      return
    }

    // 5. Build _the_ picotool
    try {
      if (process.env.PICO_SDK_PATH === undefined) {
        yield { type: 'info', message: 'Setting PICO_SDK_PATH' }
        process.env.PICO_SDK_PATH = PICO_SDK_DIR
        await upsert(EXPORTS_FILE_PATH, `export PICO_SDK_PATH=${PICO_SDK_DIR}`)
      } else {
        yield { type: 'info', message: `Using existing $PICO_SDK_PATH: ${process.env.PICO_SDK_PATH}` }
      }

      if (process.env.PIOASM === undefined) {
        yield { type: 'info', message: 'Setting PIOASM' }
        process.env.PIOASM = PIOASM_PATH
        await upsert(EXPORTS_FILE_PATH, `export PIOASM=${PIOASM_PATH}`)
      } else {
        yield { type: 'info', message: `Using existing $PIOASM: ${process.env.PIOASM}` }
      }

      const shouldBuildPicktool = !existsSync(PICOTOOL_BUILD_DIR) ||
        (await readdir(PICOTOOL_BUILD_DIR).catch(() => [])).length === 0

      if (shouldBuildPicktool) {
        yield { type: 'step:start', message: 'Build the picotool CLI' }
        await mkdir(PICOTOOL_BUILD_DIR, { recursive: true })
        await execaCommand('cmake ..', {
          shell: process.env.SHELL ?? '/bin/bash',
          stdio: 'inherit',
          cwd: PICOTOOL_BUILD_DIR,
        })
        await execaCommand('make', {
          shell: process.env.SHELL ?? '/bin/bash',
          stdio: 'inherit',
          cwd: PICOTOOL_BUILD_DIR,
        })
        await upsert(EXPORTS_FILE_PATH, `export PATH="${PICOTOOL_BUILD_DIR}:$PATH"`)
        yield { type: 'step:done' }
      }
    } catch (error) {
      yield { type: 'step:fail', message: `Error building picotool: ${String(error)}` }
      return
    }

    yield {
      type: 'step:done',
      message: `Successfully set up pico platform support for Moddable!
Test out the setup by starting a new terminal session and putting the device into programming mode by holding the BOOTSEL button when powering on the Pico
Then run: xs-dev run --example helloworld --device pico`,
    }
  },

  async *update(ctx: HostContext, prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    const PICO_BRANCH = '2.0.0'
    const PICO_ROOT = process.env.PICO_ROOT ?? resolve(INSTALL_DIR, 'pico')
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
      if (ctx.platform === 'mac') {
        const cmakeCheck = await execaCommand('which cmake', { reject: false })
        if (cmakeCheck.exitCode !== 0) {
          yield { type: 'step:start', message: 'Cmake required, installing with Homebrew' }
          await execaCommand('brew install cmake')
          yield { type: 'step:done' }
        }

        for await (const event of installMacDeps(prompter)) {
          yield event
        }

        const brewPrefixResult = await execaCommand('brew --prefix')
        const brewPrefix = String(brewPrefixResult.stdout).trim()
        process.env.PICO_GCC_ROOT = brewPrefix
        await upsert(EXPORTS_FILE_PATH, `export PICO_GCC_ROOT=${brewPrefix}`)
      }

      if (ctx.platform === 'lin') {
        yield { type: 'step:start', message: 'Installing build dependencies with apt' }
        for await (const event of installLinuxDeps(prompter)) {
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

      // Build some pico tools:
      yield { type: 'step:start', message: 'Building pico tools' }
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

      // Build _the_ picotool
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
  },

  async *teardown(_ctx: HostContext, _prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    try {
      yield { type: 'step:start', message: 'Removing pico tooling' }
      rmSync(join(INSTALL_DIR, 'pico'), { recursive: true, force: true })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error removing pico tooling: ${String(error)}` }
    }
  },

  async verify(_ctx: HostContext): Promise<VerifyResult> {
    const missing: string[] = []

    if (process.env.PICO_SDK_PATH === undefined || process.env.PICO_SDK_PATH === '') {
      missing.push('PICO_SDK_PATH env var not set')
    } else if (!existsSync(process.env.PICO_SDK_PATH)) {
      missing.push(`PICO_SDK_PATH path does not exist: ${process.env.PICO_SDK_PATH}`)
    }

    if (process.env.PIOASM === undefined || process.env.PIOASM === '') {
      missing.push('PIOASM env var not set')
    } else if (!existsSync(process.env.PIOASM)) {
      missing.push(`PIOASM path does not exist: ${process.env.PIOASM}`)
    }

    if (missing.length > 0) {
      return { ok: false, toolchain: 'pico', missing }
    }

    return { ok: true, toolchain: 'pico' }
  },

  getEnvVars(ctx: HostContext): Record<string, string> {
    // On Linux, /usr is always the GCC root. On macOS/Windows, PICO_GCC_ROOT is
    // set by install() via `brew --prefix`. The fallback '' is intentional —
    // verify() will catch a missing value before any build proceeds.
    const defaultGccRoot = ctx.platform === 'lin' ? '/usr' : ''
    return {
      PICO_SDK_PATH: resolve(INSTALL_DIR, 'pico', 'pico-sdk'),
      PIOASM: resolve(INSTALL_DIR, 'pico', 'pico-sdk', 'build', 'pioasm', 'pioasm'),
      PICO_GCC_ROOT: process.env.PICO_GCC_ROOT ?? defaultGccRoot,
    }
  },
}
