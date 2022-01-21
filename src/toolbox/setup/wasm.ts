import { print, filesystem, system } from 'gluegun'
import { type as platformType } from 'os'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from './constants'
import { moddableExists } from './moddable'
import upsert from '../patching/upsert'

export default async function (): Promise<void> {
  const OS = platformType().toLowerCase()
  const EMSDK_REPO = 'https://github.com/emscripten-core/emsdk.git'
  const BINARYEN_REPO = 'https://github.com/WebAssembly/binaryen.git'
  const WASM_DIR = filesystem.resolve(INSTALL_DIR, 'wasm')
  const EMSDK_PATH = filesystem.resolve(WASM_DIR, 'emsdk')
  const BINARYEN_PATH = filesystem.resolve(WASM_DIR, 'binaryen')

  const spinner = print.spin({ stream: process.stdout })
  spinner.start('Setting up wasm simulator tools')

  // 0. ensure wasm instal directory and Moddable exists
  if (!moddableExists()) {
    spinner.fail(
      'Moddable platform tooling required. Run `xs-dev setup` before trying again.'
    )
    process.exit(1)
  }
  spinner.info('Ensuring wasm directory')
  filesystem.dir(WASM_DIR)
  filesystem.file(EXPORTS_FILE_PATH)

  // 1. Clone EM_SDK repo, install, and activate latest version
  if (filesystem.exists(EMSDK_PATH) === false) {
    spinner.start('Cloning emsdk repo')
    try {
      await system.spawn(`git clone ${EMSDK_REPO} ${EMSDK_PATH}`)

      spinner.start('Installing latest EMSDK')
      await system.exec('./emsdk install latest', {
        cwd: EMSDK_PATH,
        stdout: process.stdout,
      })
      await system.exec('./emsdk activate latest', {
        cwd: EMSDK_PATH,
        stdout: process.stdout,
      })
      await upsert(
        EXPORTS_FILE_PATH,
        `source ${filesystem.resolve(EMSDK_PATH, 'emsdk_env.sh')}`
      )
    } catch (error) {
      spinner.fail(`Error activating emsdk: ${String(error)}`)
      process.exit(1)
    }
  }
  spinner.succeed('emsdk setup complete')

  // 2. Clone Binaryen repo and build
  if (filesystem.exists(BINARYEN_PATH) === false) {
    spinner.start('Cloning binaryen repo')
    await system.spawn(
      `git clone --recursive ${BINARYEN_REPO} ${BINARYEN_PATH}`
    )

    spinner.info('Binaryen repo cloned')

    if (system.which('cmake') === null) {
      if (OS === 'darwin') {
        spinner.start('Cmake required, installing with Homebrew')
        await system.exec('brew install cmake')
      }

      if (OS === 'linux') {
        spinner.start('Cmake required, installing with apt')
        await system.exec('sudo apt --yes install cmake')
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
  }

  // 3. Setup PATH and env variables for EM_SDK and Binaryen
  spinner.info('Sourcing adding binaryen to PATH')
  await upsert(
    EXPORTS_FILE_PATH,
    `export PATH=${filesystem.resolve(BINARYEN_PATH, 'bin')}:$PATH`
  )
  process.env.PATH = `${String(process.env.PATH)}:${filesystem.resolve(
    BINARYEN_PATH,
    'bin'
  )}`

  // 4. Build Moddable WASM tools
  if (
    filesystem.exists(
      filesystem.resolve(String(process.env.MODDABLE), 'build', 'bin', 'wasm')
    ) === false
  ) {
    spinner.start('Building Moddable wasm tools')
    await system.exec(`make`, {
      cwd: filesystem.resolve(
        String(process.env.MODDABLE),
        'build',
        'makefiles',
        'wasm'
      ),
      stdout: process.stdout,
    })
  }
  await system.exec(`source ${EXPORTS_FILE_PATH}`, {
    shell: process.env.SHELL,
    stdout: process.stdout,
  })

  spinner.succeed(
    `Successfully set up wasm platform support for Moddable! Test out the setup by starting a new terminal session and running: xs-dev run --example helloworld --device wasm`
  )
}
