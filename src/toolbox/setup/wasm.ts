import { mkdir } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { type as platformType } from 'node:os'
import { execSync } from 'node:child_process'
import { execaCommand, execa } from '../system/execa.js'
import { INSTALL_DIR, INSTALL_PATH, EXPORTS_FILE_PATH } from './constants'
import { moddableExists } from './moddable'
import upsert from '../patching/upsert'
import { execWithSudo } from '../system/exec'
import { ensureHomebrew } from './homebrew'
import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

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

function which(bin: string): string | null {
  try {
    const result = execSync(`which ${bin}`, { stdio: 'pipe' }).toString().trim()
    return result.length > 0 ? result : null
  } catch {
    return null
  }
}

export default async function* setupWasm(
  _args: Record<string, unknown>,
  _prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  yield { type: 'step:start', message: 'Setting up wasm simulator tools' }

  const OS = platformType().toLowerCase()
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
      if (OS === 'darwin') {
        await ensureHomebrew()
        yield { type: 'step:start', message: 'Installing cmake with Homebrew' }
        await execaCommand('brew install cmake')
        yield { type: 'step:done' }
      }

      if (OS === 'linux') {
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
}
