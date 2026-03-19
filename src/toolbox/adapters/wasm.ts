import { mkdir } from 'node:fs/promises'
import { existsSync, rmSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { execa, execaCommand } from 'execa'
import { INSTALL_DIR, INSTALL_PATH, EXPORTS_FILE_PATH } from '../setup/constants.js'
import { moddableExists } from '../setup/moddable.js'
import upsert from '../patching/upsert.js'
import { execWithSudo, which } from '../system/exec.js'
import { ensureHomebrew } from '../setup/homebrew.js'
import type { TargetAdapter, AdapterContext, VerifyResult } from './interface.js'
import type { OperationEvent } from '../../lib/events.js'
import type { Prompter } from '../../lib/prompter.js'

function isDir(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory()
  } catch {
    return false
  }
}

function isFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile()
  } catch {
    return false
  }
}

export const wasmAdapter: TargetAdapter = {
  name: 'wasm',
  platforms: ['mac', 'lin'],

  async *install(ctx: AdapterContext, prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    yield { type: 'step:start', message: 'Setting up wasm simulator tools' }

    const EMSDK_REPO = 'https://github.com/emscripten-core/emsdk.git'
    const BINARYEN_REPO = 'https://github.com/WebAssembly/binaryen.git'
    const WASM_DIR = resolve(INSTALL_DIR, 'wasm')
    const EMSDK_PATH = resolve(WASM_DIR, 'emsdk')
    const BINARYEN_PATH = resolve(WASM_DIR, 'binaryen')

    // 0. ensure wasm install directory and Moddable exists
    if (!moddableExists()) {
      yield { type: 'step:fail', message: 'Moddable platform tooling required. Run `xs-dev setup` before trying again.' }
      return
    }

    try {
      yield { type: 'step:start', message: 'Ensuring wasm directory' }
      await mkdir(WASM_DIR, { recursive: true })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error creating wasm directory: ${String(error)}` }
      return
    }

    // 1. Clone EM_SDK repo, install, and activate latest version
    if (!isDir(EMSDK_PATH)) {
      try {
        yield { type: 'step:start', message: 'Cloning emsdk repo' }
        await execa('git', [
          'clone',
          '--depth', '1',
          '--single-branch',
          '-b', 'main',
          EMSDK_REPO,
          EMSDK_PATH,
        ])
        yield { type: 'step:done' }
      } catch (error) {
        yield { type: 'step:fail', message: `Error cloning emsdk repo: ${String(error)}` }
        return
      }
    }

    const shouldBuildEmsdk =
      process.env.EMSDK === undefined ||
      process.env.EMSDK === '' ||
      !isDir(process.env.EMSDK) ||
      !isFile(process.env.EMSDK_NODE ?? '') ||
      !isFile(process.env.EMSDK_PYTHON ?? '')

    if (shouldBuildEmsdk) {
      try {
        // clear residual env settings
        process.env.EMSDK = ''
        process.env.EMSDK_NODE = ''
        process.env.EMSDK_PYTHON = ''

        yield { type: 'step:start', message: 'Installing latest EMSDK' }
        await execaCommand('./emsdk install latest', { cwd: EMSDK_PATH })
        await execaCommand('./emsdk activate latest', { cwd: EMSDK_PATH })
        await upsert(EXPORTS_FILE_PATH, 'export EMSDK_QUIET=1')
        await upsert(
          EXPORTS_FILE_PATH,
          `source ${resolve(EMSDK_PATH, 'emsdk_env.sh')} 1> /dev/null`,
        )
        yield { type: 'step:done' }
      } catch (error) {
        yield { type: 'step:fail', message: `Error activating emsdk: ${String(error)}` }
        return
      }
    }
    yield { type: 'info', message: 'emsdk setup complete' }

    // 2. Clone Binaryen repo and build
    if (!isDir(BINARYEN_PATH)) {
      try {
        yield { type: 'step:start', message: 'Cloning binaryen repo' }
        await execa('git', [
          'clone',
          '--depth', '1',
          '--single-branch',
          '-b', 'main',
          '--recursive',
          BINARYEN_REPO,
          BINARYEN_PATH,
        ])
        yield { type: 'step:done' }
      } catch (error) {
        yield { type: 'step:fail', message: `Error cloning binaryen repo: ${String(error)}` }
        return
      }
    }

    if (which('cmake') === null) {
      try {
        if (ctx.platform === 'mac') {
          for await (const event of ensureHomebrew(prompter)) {
            yield event
          }
          yield { type: 'step:start', message: 'Installing cmake with Homebrew' }
          await execaCommand('brew install cmake', { shell: process.env.SHELL ?? '/bin/bash' })
          yield { type: 'step:done' }
        }

        if (ctx.platform === 'lin') {
          yield { type: 'step:start', message: 'Installing cmake with apt' }
          const result = await execWithSudo('apt --yes install build-essential cmake')
          if (result.success) {
            yield { type: 'step:done' }
          } else {
            yield { type: 'step:fail', message: `Error installing cmake: ${result.error}` }
            return
          }
        }
      } catch (error) {
        yield { type: 'step:fail', message: `Error installing cmake: ${String(error)}` }
        return
      }
    }

    try {
      yield { type: 'step:start', message: 'Building Binaryen tooling with cmake' }
      await execaCommand('cmake .', { cwd: BINARYEN_PATH })
      yield { type: 'step:done' }

      yield { type: 'step:start', message: 'Building with make (this could take a couple minutes)' }
      await execaCommand('make', { cwd: BINARYEN_PATH })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error building Binaryen: ${String(error)}` }
      return
    }

    // 3. Setup PATH and env variables for EM_SDK and Binaryen
    try {
      const binaryenBinPath = resolve(BINARYEN_PATH, 'bin')
      await upsert(
        EXPORTS_FILE_PATH,
        `export PATH=${binaryenBinPath}:$PATH`,
      )
      process.env.PATH = `${binaryenBinPath}:${String(process.env.PATH)}`
      yield { type: 'info', message: 'Added binaryen to PATH' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error setting up PATH: ${String(error)}` }
      return
    }

    // 4. Build Moddable WASM tools
    try {
      const wasmBinPath = resolve(INSTALL_PATH, 'build', 'bin', 'wasm')
      if (!isDir(wasmBinPath)) {
        yield { type: 'step:start', message: 'Building Moddable wasm tools' }
        await execaCommand('make', {
          cwd: resolve(
            INSTALL_PATH,
            'build',
            'makefiles',
            'wasm',
          ),
        })
        yield { type: 'step:done' }
      }
    } catch (error) {
      yield { type: 'step:fail', message: `Error building Moddable wasm tools: ${String(error)}` }
      return
    }

    yield { type: 'step:done', message: 'Successfully set up wasm platform support for Moddable! Test out the setup by starting a new terminal session and running: xs-dev run --example helloworld --device wasm' }
  },

  async *update(_ctx: AdapterContext, _prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    yield { type: 'warning', message: 'Wasm update is not currently supported' }
  },

  async *teardown(_ctx: AdapterContext, _prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    try {
      yield { type: 'step:start', message: 'Removing wasm tooling' }
      rmSync(resolve(INSTALL_DIR, 'wasm'), { recursive: true, force: true })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error removing wasm tooling: ${String(error)}` }
    }
  },

  async verify(_ctx: AdapterContext): Promise<VerifyResult> {
    const missing: string[] = []

    if (process.env.EMSDK === undefined || process.env.EMSDK === '' || !existsSync(process.env.EMSDK)) {
      missing.push('EMSDK env var not set or path does not exist')
    }
    if (process.env.EMSDK_NODE === undefined || process.env.EMSDK_NODE === '' || !existsSync(process.env.EMSDK_NODE)) {
      missing.push('EMSDK_NODE env var not set or path does not exist')
    }
    if (process.env.EMSDK_PYTHON === undefined || process.env.EMSDK_PYTHON === '' || !existsSync(process.env.EMSDK_PYTHON)) {
      missing.push('EMSDK_PYTHON env var not set or path does not exist')
    }
    if (which('wasm-opt') === null) {
      missing.push('wasm-opt not found on PATH')
    }

    if (missing.length > 0) {
      return { ok: false, adapter: 'wasm', missing }
    }

    return { ok: true, adapter: 'wasm' }
  },

  getEnvVars(_ctx: AdapterContext): Record<string, string> {
    const WASM_DIR = resolve(INSTALL_DIR, 'wasm')
    const EMSDK_PATH = resolve(WASM_DIR, 'emsdk')
    const BINARYEN_PATH = resolve(WASM_DIR, 'binaryen')
    return {
      EMSDK: EMSDK_PATH,
      PATH: `${resolve(BINARYEN_PATH, 'bin')}:${process.env.PATH ?? ''}`,
    }
  },
}
