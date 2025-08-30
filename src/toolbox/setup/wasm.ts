import { print, filesystem, system } from 'gluegun'
import { type as platformType } from 'os'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from './constants'
import { moddableExists } from './moddable'
import upsert from '../patching/upsert'
import { execWithSudo, sourceEnvironment } from '../system/exec'
import { ensureHomebrew } from './homebrew'
import { failure, successVoid } from '../system/errors'
import type { SetupResult } from '../../types'

export default async function (): Promise<SetupResult> {
  const OS = platformType().toLowerCase()
  const EMSDK_REPO = 'https://github.com/emscripten-core/emsdk.git'
  const BINARYEN_REPO = 'https://github.com/WebAssembly/binaryen.git'
  const WASM_DIR = filesystem.resolve(INSTALL_DIR, 'wasm')
  const EMSDK_PATH = filesystem.resolve(WASM_DIR, 'emsdk')
  const BINARYEN_PATH = filesystem.resolve(WASM_DIR, 'binaryen')

  await sourceEnvironment()

  const spinner = print.spin({ stream: process.stdout })
  spinner.start('Setting up wasm simulator tools')

  // 0. ensure wasm instal directory and Moddable exists
  if (!moddableExists()) {
    spinner.fail(
      'Moddable platform tooling required. Run `xs-dev setup` before trying again.',
    )
    return failure('Moddable platform tooling required. Run `xs-dev setup` before trying again.')
  }
  spinner.info('Ensuring wasm directory')
  filesystem.dir(WASM_DIR)

  // 1. Clone EM_SDK repo, install, and activate latest version
  if (filesystem.exists(EMSDK_PATH) === false) {
    spinner.start('Cloning emsdk repo')
    await system.spawn(
      `git clone --depth 1 --single-branch -b main ${EMSDK_REPO} ${EMSDK_PATH}`,
    )
    spinner.succeed()
  }

  const shouldBuildEmsdk =
    process.env.EMSDK === undefined ||
    filesystem.exists(process.env.EMSDK) !== 'dir' ||
    filesystem.exists(process.env.EMSDK_NODE ?? '') !== 'file' ||
    filesystem.exists(process.env.EMSDK_PYTHON ?? '') !== 'file'

  if (shouldBuildEmsdk) {
    try {
      // clear residual env settings
      process.env.EMSDK = ''
      process.env.EMSDK_NODE = ''
      process.env.EMSDK_PYTHON = ''

      spinner.start('Installing latest EMSDK')
      print.debug(EMSDK_PATH)
      await system.exec('./emsdk install latest', {
        process,
        cwd: EMSDK_PATH,
        stdout: process.stdout,
      })
      await system.exec('./emsdk activate latest', {
        process,
        cwd: EMSDK_PATH,
        stdout: process.stdout,
      })
      await upsert(EXPORTS_FILE_PATH, `export EMSDK_QUIET=1`)
      await upsert(
        EXPORTS_FILE_PATH,
        `source ${filesystem.resolve(EMSDK_PATH, 'emsdk_env.sh')} 1> /dev/null`,
      )
    } catch (error) {
      spinner.fail(`Error activating emsdk: ${String(error)}`)
      return failure(`Error activating emsdk: ${String(error)}`)
    }
  }
  spinner.succeed('emsdk setup complete')

  // 2. Clone Binaryen repo and build
  if (filesystem.exists(BINARYEN_PATH) === false) {
    spinner.start('Cloning binaryen repo')
    await system.spawn(
      `git clone --depth 1 --single-branch -b main --recursive ${BINARYEN_REPO} ${BINARYEN_PATH}`,
    )
    spinner.succeed()
  }

  if (system.which('cmake') === null) {
    if (OS === 'darwin') {
      try {
        await ensureHomebrew()
      } catch (error: unknown) {
        if (error instanceof Error) {
          print.info(`${error.message} cmake`)
          return failure(`${error.message} cmake`)
        }
      }

      spinner.start('Cmake required, installing with Homebrew')
      await system.exec('brew install cmake', { shell: process.env.SHELL })
    }

    if (OS === 'linux') {
      spinner.start('Cmake required, installing with apt')
      await execWithSudo('apt --yes install build-essential cmake')
    }
    spinner.succeed()
  }

  spinner.start('Building Binaryen tooling')
  await system.exec('cmake .', {
    cwd: BINARYEN_PATH,
    stdout: process.stdout,
  })
  spinner.succeed('cmake complete')
  spinner.start('Start make process, this could take a couple minutes')
  await system.exec('make', {
    cwd: BINARYEN_PATH,
    stdout: process.stdout,
  })
  spinner.succeed()

  // 3. Setup PATH and env variables for EM_SDK and Binaryen
  spinner.info('Sourcing adding binaryen to PATH')
  await upsert(
    EXPORTS_FILE_PATH,
    `export PATH=${filesystem.resolve(BINARYEN_PATH, 'bin')}:$PATH`,
  )
  process.env.PATH = `${String(process.env.PATH)}:${filesystem.resolve(
    BINARYEN_PATH,
    'bin',
  )}`

  // 4. Build Moddable WASM tools
  if (
    filesystem.exists(
      filesystem.resolve(String(process.env.MODDABLE), 'build', 'bin', 'wasm'),
    ) === false
  ) {
    spinner.start('Building Moddable wasm tools')
    await system.exec(`make`, {
      cwd: filesystem.resolve(
        String(process.env.MODDABLE),
        'build',
        'makefiles',
        'wasm',
      ),
      stdout: process.stdout,
    })
  }
  await system.exec(`source ${EXPORTS_FILE_PATH}`, {
    shell: process.env.SHELL,
    stdout: process.stdout,
  })

  spinner.succeed(
    `Successfully set up wasm platform support for Moddable! Test out the setup by starting a new terminal session and running: xs-dev run --example helloworld --device wasm`,
  )

  return successVoid()
}
