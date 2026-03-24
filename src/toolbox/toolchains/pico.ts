import { chmod, mkdir, readdir, rm, symlink } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { debuglog } from 'node:util'
import { execaCommand } from 'execa'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from '../setup/constants.js'
import upsert from '../patching/upsert.js'
import { sourceEnvironment, which, execWithSudo } from '../system/exec.js'
import { ensureHomebrew, formulaeExists } from '../setup/homebrew.js'
import { isFailure } from '../system/errors.js'
import { exists } from '../system/filesystem.js'
import type { Toolchain, HostContext, VerifyResult } from './interface.js'
import type { OperationEvent } from '../../lib/events.js'
import type { Prompter } from '../../lib/prompter.js'
import { Octokit } from '@octokit/rest'
import { downloadReleaseTools } from '../setup/moddable.js'

const debug = debuglog('xs-dev:toolchains:pico')

async function* installMacDeps(prompter: Prompter): AsyncGenerator<OperationEvent> {
  try {
    for await (const event of ensureHomebrew(prompter)) {
      yield event
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      yield { type: 'step:fail', message: `${error.message} gcc-arm-embedded, libusb, pkg-config` }
    }
    return
  }

  if (
    which('arm-none-eabi-gcc') !== null &&
    (await formulaeExists('arm-none-eabi-gcc'))
  ) {
    try {
      debug('Removing outdated arm gcc dependency')
      await execaCommand('brew untap ArmMbed/homebrew-formulae', { shell: process.env.SHELL ?? '/bin/bash' })
      await execaCommand('brew uninstall arm-none-eabi-gcc', { shell: process.env.SHELL ?? '/bin/bash' })
      debug('Outdated gcc dependency removed')
    } catch (error: unknown) {
      yield { type: 'step:fail', message: `Error removing outdated gcc: ${String(error)}` }
    }
  }

  try {
    debug('Installing pico tools dependencies')
    const requiredDeps = ['libusb', 'pkg-config']
    if (which('cmake') === null) {
      requiredDeps.push('cmake')
    }

    await execaCommand(`brew install ${requiredDeps.join(' ')}`, {
      shell: process.env.SHELL ?? '/bin/bash',
    })
    await execaCommand('brew install --cask gcc-arm-embedded', {
      shell: process.env.SHELL ?? '/bin/bash',
    })
    debug('Pico tools deps installed')
  } catch (error: unknown) {
    yield { type: 'step:fail', message: `Error installing pico dependencies: ${String(error)}` }
  }
}

async function* installLinuxDeps(_prompter: Prompter): AsyncGenerator<OperationEvent> {
  try {
    debug('Installing pico build dependencies')
    const result = await execWithSudo(
      'apt-get install --yes cmake gcc-arm-none-eabi libnewlib-arm-none-eabi build-essential libusb-1.0.0-dev pkg-config',
    )
    if (isFailure(result)) {
      yield { type: 'step:fail', message: `Error installing dependencies: ${result.error}` }
      return
    }
    debug('Pico tools deps installed')
  } catch (error) {
    yield { type: 'step:fail', message: `Error installing pico linux dependencies: ${String(error)}` }
  }
}

const PICO_VERSION = '2.0.0'
const repos = {
  PICO_SDK: {
    branch: PICO_VERSION,
    url: 'https://github.com/raspberrypi/pico-sdk'
  },
  PICO_EXTRAS: { branch: `sdk-${PICO_VERSION}`, url: 'https://github.com/raspberrypi/pico-extras' },
  PICO_EXAMPLES: { branch: `sdk-${PICO_VERSION}`, url: 'https://github.com/raspberrypi/pico-examples' },
  PICOTOOL: { branch: PICO_VERSION, url: 'https://github.com/raspberrypi/picotool' },
  PICO_SDK_TOOLS: { branch: 'v2.0.0-5', url: 'https://github.com/raspberrypi/pico-sdk-tools' }
}

export const picoToolchain: Toolchain = {
  name: 'pico',
  platforms: ['mac', 'lin'],

  async *install(ctx: HostContext, prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    yield { type: 'step:start', message: 'Starting pico tooling setup' }

    const PICO_ROOT = process.env.PICO_ROOT ?? resolve(INSTALL_DIR, 'pico')
    const PICO_SDK_DIR = resolve(PICO_ROOT, 'pico-sdk')
    const PICO_EXTRAS_DIR = resolve(PICO_ROOT, 'pico-extras')
    const PICO_EXAMPLES_PATH = resolve(PICO_ROOT, 'pico-examples')
    const PICOTOOL_PATH = resolve(PICO_ROOT, 'picotool')
    const PICOTOOL_BUILD_DIR = resolve(PICOTOOL_PATH, 'build')
    const PIOASM_PATH = resolve(PICO_ROOT, 'pioasm', 'pioasm')

    await sourceEnvironment()

    try {
      debug('Ensuring pico directory')
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
      debug('Dependencies installed')
    } catch (error) {
      yield { type: 'step:fail', message: `Error during dependency installation: ${String(error)}` }
      return
    }

    // 2. Install the pico sdk, extras, examples, and picotool:
    const gitDeps = [
      { ...repos.PICO_SDK, dest: PICO_SDK_DIR },
      { ...repos.PICO_EXTRAS, dest: PICO_EXTRAS_DIR },
      { ...repos.PICO_EXAMPLES, dest: PICO_EXAMPLES_PATH },
    ]
    const clone = async ({ branch, url, dest }: { branch: string, url: string, dest: string }): Promise<void> => {
      if (await exists(dest)) return
      debug(`Cloning ${url}`)
      await execaCommand(`git clone --depth 1 --single-branch --recurse-submodules --shallow-submodules -b ${branch} ${url} ${dest}`)
      debug(`Cloned to ${dest}`)
    }

    try {
      await Promise.all(gitDeps.map(async dep => { await clone(dep); }))
    } catch (error) {
      yield { type: 'step:fail', message: `Error cloning repositories: ${String(error)}` }
      return
    }

    // download pico-sdk-tools release
    const octokit = new Octokit()
    const { data: taggedRelease } = await octokit.rest.repos.getReleaseByTag({
      owner: 'raspberrypi',
      repo: 'pico-sdk-tools',
      tag: repos.PICO_SDK_TOOLS.branch,
    })
    const assets = [`pico-sdk-tools-${PICO_VERSION}`, `picotool-${PICO_VERSION}`].map(asset => {
      switch (ctx.platform) {
        case 'mac':
          return `${asset}-mac.zip`
        case 'win':
          return `${asset}-x64-win.zip`
        case 'lin': {
          if (ctx.arch === 'arm64') return `${asset}-aarch64-lin.tar.gz`
          return `${asset}-x86_64-lin.tar.gz`
        }
        default:
          return 'N/A'
      }
    })
    try {
      debug('Downloading pico-sdk-tools')
      // oxlint-disable-next-line @typescript-eslint/promise-function-async
      await Promise.all(assets.map(assetName => downloadReleaseTools({ writePath: PICO_ROOT, assetName, release: taggedRelease })))
      debug('Downloaded pico-sdk-tools to PICO_ROOT')

      const toolPaths = [resolve(PICO_ROOT, 'pioasm', 'pioasm'), resolve(PICO_ROOT, 'picotool', 'picotool')]
      // oxlint-disable-next-line @typescript-eslint/promise-function-async
      await Promise.all(toolPaths.map(toolPath => chmod(toolPath, 0o751)))
      debug('Set executable permissions on tool binaries')

      const symlinkDir = resolve(PICO_SDK_DIR, 'build', '_deps', 'picotool')
      const symlinkPath = resolve(symlinkDir, 'picotool')
      await mkdir(symlinkDir, { recursive: true })
      await rm(symlinkPath, { force: true })
      await symlink(resolve(PICO_ROOT, 'picotool', 'picotool'), symlinkPath)
      debug('Created picotool compatibility symlink for Moddable make.pico.mk')

      yield { type: 'step:done', message: 'Ending earlier to investigate results' }
    } catch (error) {
      yield { type: 'step:fail', message: `Unable to download pico-sdk-tools release assets: ${error instanceof Error ? error.message : 'Unknown'}` }
      return
    }

    // 3. Set the PICO_SDK_PATH and related environment variables
    try {
      if (process.env.PICO_SDK_DIR === undefined) {
        debug('Setting PICO_SDK_DIR')
        process.env.PICO_SDK_DIR = PICO_SDK_DIR
        await upsert(EXPORTS_FILE_PATH, `export PICO_SDK_DIR=${PICO_SDK_DIR}`)
      } else {
        debug(`Using existing $PICO_SDK_DIR: ${process.env.PICO_SDK_DIR}`)
      }

      if (process.env.PICO_EXTRAS_DIR === undefined) {
        debug('Setting PICO_EXTRAS_DIR')
        process.env.PICO_EXTRAS_DIR = PICO_EXTRAS_DIR
        await upsert(EXPORTS_FILE_PATH, `export PICO_EXTRAS_DIR=${PICO_EXTRAS_DIR}`)
      } else {
        debug(`Using existing $PICO_EXTRAS_DIR: ${process.env.PICO_EXTRAS_DIR}`)
      }

      if (process.env.PICO_EXAMPLES_DIR === undefined) {
        debug('Setting PICO_EXAMPLES_DIR')
        process.env.PICO_EXAMPLES_DIR = PICO_EXAMPLES_PATH
        await upsert(
          EXPORTS_FILE_PATH,
          `export PICO_EXAMPLES_DIR=${PICO_EXAMPLES_PATH}`,
        )
      } else {
        debug(`Using existing $PICO_EXAMPLES_DIR: ${process.env.PICO_EXAMPLES_DIR}`)
      }
    } catch (error) {
      yield { type: 'step:fail', message: `Error setting environment variables: ${String(error)}` }
      return
    }

    // 5. Build _the_ picotool
    try {
      if (process.env.PICO_SDK_PATH === undefined) {
        debug('Setting PICO_SDK_PATH')
        process.env.PICO_SDK_PATH = PICO_SDK_DIR
        await upsert(EXPORTS_FILE_PATH, `export PICO_SDK_PATH=${PICO_SDK_DIR}`)
      } else {
        debug(`Using existing $PICO_SDK_PATH: ${process.env.PICO_SDK_PATH}`)
      }

      if (process.env.PIOASM === undefined) {
        debug('Setting PIOASM')
        process.env.PIOASM = PIOASM_PATH
        await upsert(EXPORTS_FILE_PATH, `export PIOASM=${PIOASM_PATH}`)
      } else {
        debug(`Using existing $PIOASM: ${process.env.PIOASM}`)
      }

      const shouldBuildPicotool = !(await exists(PICOTOOL_PATH)) ||
        (await readdir(PICOTOOL_PATH).catch(() => [])).length === 0

      await upsert(EXPORTS_FILE_PATH, `export PATH="${PICOTOOL_PATH}:$PATH"`)

      if (shouldBuildPicotool) {
        debug('Build the picotool CLI')
        await mkdir(PICOTOOL_BUILD_DIR, { recursive: true })
        await execaCommand('cmake ..', {
          shell: process.env.SHELL ?? '/bin/bash',
          cwd: PICOTOOL_BUILD_DIR,
        })
        await execaCommand('make', {
          shell: process.env.SHELL ?? '/bin/bash',
          cwd: PICOTOOL_BUILD_DIR,
        })
        debug('picotool CLI built successfully')
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
    const PICO_ROOT = process.env.PICO_ROOT ?? resolve(INSTALL_DIR, 'pico')
    const PICO_SDK_DIR = resolve(PICO_ROOT, 'pico-sdk')
    const PICO_EXTRAS_DIR = resolve(PICO_ROOT, 'pico-extras')
    const PICO_EXAMPLES_PATH = resolve(PICO_ROOT, 'pico-examples')
    const PICOTOOL_PATH = resolve(PICO_ROOT, 'picotool')

    await sourceEnvironment()

    yield { type: 'step:start', message: 'Starting pico tooling update' }

    debug('Ensuring pico toolchain directory')
    if (
      !(await exists(PICO_ROOT)) ||
      !(await exists(PICO_SDK_DIR)) ||
      !(await exists(PICO_EXTRAS_DIR)) ||
      !(await exists(PICO_EXAMPLES_PATH)) ||
      !(await exists(PICOTOOL_PATH))
    ) {
      yield {
        type: 'step:fail',
        message: 'Pico tooling required. Run `xs-dev setup --device pico` before trying again.',
      }
      return
    } else {
      debug('Found existing pico tooling!')
    }

    // 1. Install required components
    try {
      if (ctx.platform === 'mac') {
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
      if (await exists(PICO_SDK_DIR)) {
        debug('Updating pico-sdk repo')
        await execaCommand('git fetch --all --tags', { cwd: PICO_SDK_DIR })
        await execaCommand(`git checkout ${PICO_VERSION}`, { cwd: PICO_SDK_DIR })
        await execaCommand('git submodule update --init --recursive', {
          cwd: PICO_SDK_DIR,
        })
        debug('pico-sdk repo updated')
      }

      if (await exists(PICO_EXTRAS_DIR)) {
        debug('Updating pico-extras repo')
        await execaCommand('git fetch --all --tags', { cwd: PICO_EXTRAS_DIR })
        await execaCommand(`git checkout sdk-${PICO_VERSION}`, {
          cwd: PICO_EXTRAS_DIR,
        })
        debug('pico-extras repo updates')
      }

      if (await exists(PICO_EXAMPLES_PATH)) {
        debug('Updating pico-examples repo')
        await execaCommand('git fetch --all --tags', { cwd: PICO_EXAMPLES_PATH })
        await execaCommand(`git checkout sdk-${PICO_VERSION}`, {
          cwd: PICO_EXAMPLES_PATH,
        })
        debug('pico-examples repo updated')
      }

      const octokit = new Octokit()
      const { data: taggedRelease } = await octokit.rest.repos.getReleaseByTag({
        owner: 'raspberrypi',
        repo: 'pico-sdk-tools',
        tag: repos.PICO_SDK_TOOLS.branch,
      })
      const assets = [`pico-sdk-tools-${PICO_VERSION}`, `picotool-${PICO_VERSION}`].map(asset => {
        switch (ctx.platform) {
          case 'mac':
            return `${asset}-mac.zip`
          case 'win':
            return `${asset}-x64-win.zip`
          case 'lin': {
            if (ctx.arch === 'arm64') return `${asset}-aarch64-lin.tar.gz`
            return `${asset}-x86_64-lin.tar.gz`
          }
          default:
            return 'N/A'
        }
      })
      try {
        debug('Downloading pico-sdk-tools')
        // oxlint-disable-next-line @typescript-eslint/promise-function-async
        await Promise.all(assets.map(assetName => downloadReleaseTools({ writePath: PICO_ROOT, assetName, release: taggedRelease })))
        debug('Downloaded pico-sdk-tools to PICO_ROOT')

        const toolPaths = [resolve(PICO_ROOT, 'pioasm', 'pioasm'), resolve(PICO_ROOT, 'picotool', 'picotool')]
        // oxlint-disable-next-line @typescript-eslint/promise-function-async
        await Promise.all(toolPaths.map(toolPath => chmod(toolPath, 0o751)))
        debug('Set executable permissions on tool binaries')

        const symlinkDir = resolve(PICO_SDK_DIR, 'build', '_deps', 'picotool')
        const symlinkPath = resolve(symlinkDir, 'picotool')
        await mkdir(symlinkDir, { recursive: true })
        await rm(symlinkPath, { force: true })
        await symlink(resolve(PICO_ROOT, 'picotool', 'picotool'), symlinkPath)
        debug('Created picotool compatibility symlink for Moddable make.pico.mk')

        yield { type: 'step:done', message: 'Ending earlier to investigate results' }
      } catch (error) {
        yield { type: 'step:fail', message: `Unable to download pico-sdk-tools release assets: ${error instanceof Error ? error.message : 'Unknown'}` }
        return
      }

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
      debug('Removing pico toolchain')
      await rm(join(INSTALL_DIR, 'pico'), { recursive: true, force: true })
      debug('Removed pico toolchain')
    } catch (error) {
      yield { type: 'step:fail', message: `Error removing pico tooling: ${String(error)}` }
    }
  },

  async verify(_ctx: HostContext): Promise<VerifyResult> {
    const missing: string[] = []

    if (process.env.PICO_SDK_PATH === undefined || process.env.PICO_SDK_PATH === '') {
      missing.push('PICO_SDK_PATH env var not set')
    } else if (!(await exists(process.env.PICO_SDK_PATH))) {
      missing.push(`PICO_SDK_PATH path does not exist: ${process.env.PICO_SDK_PATH}`)
    }

    if (process.env.PIOASM === undefined || process.env.PIOASM === '') {
      missing.push('PIOASM env var not set')
    } else if (!(await exists(process.env.PIOASM))) {
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
    const defaultGccRoot = ctx.platform === 'lin' ? '/usr' : '/opt/homebrew'
    return {
      PICO_ROOT: resolve(INSTALL_DIR, 'pico'),
      PICO_SDK_PATH: resolve(INSTALL_DIR, 'pico', 'pico-sdk'),
      PICO_SDK_DIR: resolve(INSTALL_DIR, 'pico', 'pico-sdk'),
      PIOASM: resolve(INSTALL_DIR, 'pico', 'pioasm', 'pioasm'),
      UF2CONV: resolve(INSTALL_DIR, 'pico', 'picotool', 'picotool'),
      PICO_GCC_ROOT: process.env.PICO_GCC_ROOT ?? defaultGccRoot,
    }
  },
}
