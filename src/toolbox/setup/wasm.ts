import { print, filesystem, system } from 'gluegun'
import { INSTALL_DIR, PROFILE_PATH } from './constants'
import upsert from '../patching/upsert'

export default async function (): Promise<void> {
  const EMSDK_REPO = 'https://github.com/emscripten-core/emsdk.git'
  const BINARYEN_REPO = 'https://github.com/WebAssembly/binaryen.git'
  const WASM_DIR = filesystem.resolve(INSTALL_DIR, 'wasm')
  const EMSDK_PATH = filesystem.resolve(WASM_DIR, 'emsdk')
  const BINARYEN_PATH = filesystem.resolve(WASM_DIR, 'binaryen')

  print.info('Setting up wasm simulator tools')

  // 0. ensure wasm instal directory and Moddable exists
  if (process.env.MODDABLE === undefined) {
    print.warning(
      'Moddable tooling required. Run `xs-dev setup` before trying again.'
    )
    process.exit(1)
  }
  print.info('Ensuring wasm directory')
  filesystem.dir(WASM_DIR)

  // 1. Clone EM_SDK repo, install, and activate latest version
  if (filesystem.exists(EMSDK_PATH) === false) {
    print.info('Cloning emsdk repo')
    try {
      await system.spawn(`git clone ${EMSDK_REPO} ${EMSDK_PATH}`)
      await system.spawn('./emsdk install latest', {
        cwd: EMSDK_PATH,
      })
      await system.spawn('./emsdk activate latest', {
        cwd: EMSDK_PATH,
      })
    } catch (error) {
      print.error(`Error activating emsdk: ${String(error)}`)
      process.exit(1)
    }
  }

  // 2. Clone Binaryen repo and build
  if (filesystem.exists(BINARYEN_PATH) === false) {
    print.info('Cloning binaryen repo')
    await system.spawn(`git clone ${BINARYEN_REPO} ${BINARYEN_PATH}`)

    if (system.which('cmake') === null) {
      print.info('Cmake required, installing with Homebrew')
      await system.spawn('brew install cmake')
    }

    await system.spawn('cmake . && make', {
      cwd: BINARYEN_PATH,
    })
  }

  // 3. Setup PATH and env variables for EM_SDK and Binaryen
  print.info('Sourcing emsdk environment and adding binaryen to PATH')
  await upsert(
    PROFILE_PATH,
    `source ${filesystem.resolve(EMSDK_PATH, 'emsdk_env.sh')}`
  )
  await upsert(
    PROFILE_PATH,
    `export PATH=${filesystem.resolve(BINARYEN_PATH, 'bin')}:$PATH`
  )
  process.env.PATH = `${String(process.env.PATH)}:${filesystem.resolve(
    BINARYEN_PATH,
    'bin'
  )}`

  // 4. Build Moddable WASM tools
  print.info('Building Moddable wasm tools')
  await system.spawn(`make`, {
    cwd: filesystem.resolve(
      String(process.env.MODDABLE),
      'build',
      'makefiles',
      'wasm'
    ),
  })

  print.success(
    `Successfully set up wasm platform support for Moddable! Test out the setup by plugging in your device and running: xs-dev test --device wasm`
  )
}
