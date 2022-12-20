import { print, filesystem, system } from 'gluegun'
import { type as platformType } from 'os'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from './constants'
import upsert from '../patching/upsert'
import { installDeps as installMacDeps } from './pico/mac'
import { installDeps as installLinuxDeps } from './pico/linux'
import { moddableExists } from './moddable'

export default async function(): Promise<void> {
  const OS = platformType().toLowerCase()
  const PICO_SDK_REPO = 'https://github.com/raspberrypi/pico-sdk'
  const PICO_EXAMPLES_REPO = 'https://github.com/raspberrypi/pico-examples'
  const PICOTOOL_REPO = 'https://github.com/raspberrypi/picotool'
  const PICO_ROOT = process.env.PICO_ROOT ?? filesystem.resolve(INSTALL_DIR, 'pico')
  const PICO_SDK_DIR = filesystem.resolve(PICO_ROOT, 'pico-sdk')
  const PICO_EXAMPLES_PATH = filesystem.resolve(PICO_ROOT, 'pico-examples')
  const PICOTOOL_PATH = filesystem.resolve(PICO_ROOT, 'picotool')
  const PICOTOOL_BUILD_DIR = filesystem.resolve(PICOTOOL_PATH, 'build')
  const PICO_SDK_BUILD_DIR = filesystem.resolve(PICO_SDK_DIR, 'build')
  const PIOASM_PATH = filesystem.resolve(PICO_SDK_BUILD_DIR, 'pioasm', 'pioasm')

  const spinner = print.spin()
  spinner.start('Starting pico tooling setup')

  // 0. ensure pico instal directory and Moddable exists
  if (!moddableExists()) {
    spinner.fail(
      'Moddable platform tooling required. Run `xs-dev setup` before trying again.'
    )
    process.exit(1)
  }
  spinner.info('Ensuring pico directory')
  filesystem.dir(PICO_ROOT)
  if (process.env.PICO_ROOT === undefined) {
    await upsert(EXPORTS_FILE_PATH, `export PICO_ROOT=${PICO_ROOT}`)
  }

  // 1. Install required components
  if (OS === 'darwin') {
    if (system.which('cmake') === null) {
      spinner.start('Cmake required, installing with Homebrew')
      await system.exec('brew install cmake')
      spinner.succeed()
    }

    spinner.start('Tapping ArmMbed formulae and installing arm-embed-gcc')
    await installMacDeps(spinner)

    const brewPrefix = await system.run('brew --prefix')
    process.env.PICO_GCC_ROOT = brewPrefix
    await upsert(EXPORTS_FILE_PATH, `export PICO_GCC_ROOT=${brewPrefix}`)
  }

  if (OS === 'linux') {
    spinner.start('Installing build dependencies with apt')
    await installLinuxDeps(spinner)
    process.env.PICO_GCC_ROOT = '/usr'
    await upsert(EXPORTS_FILE_PATH, `export PICO_GCC_ROOT=/usr`)
  }
  spinner.succeed()

  // 2. Install the pico sdk, examples, and picotool:
  if (filesystem.exists(PICO_SDK_DIR) === false) {
    spinner.start('Cloning pico-sdk repo')
    await system.exec(`git clone -b master ${PICO_SDK_REPO} ${PICO_SDK_DIR}`, {
      stdout: process.stdout,
    })
    await system.exec(`git submodule update --init`, {
      cwd: PICO_SDK_DIR,
      stdout: process.stdout,
    })
    spinner.succeed()
  }

  if (filesystem.exists(PICO_EXAMPLES_PATH) === false) {
    spinner.start('Cloning pico-exmples repo')
    await system.exec(
      `git clone -b master ${PICO_EXAMPLES_REPO} ${PICO_EXAMPLES_PATH}`,
      { stdout: process.stdout }
    )
    spinner.succeed()
  }

  if (filesystem.exists(PICOTOOL_PATH) === false) {
    spinner.start('Cloning picotool repo')
    await system.exec(`git clone -b master ${PICOTOOL_REPO} ${PICOTOOL_PATH}`, {
      stdout: process.stdout,
    })
    spinner.succeed()
  }

  // 3. Set the PICO_SDK_PATH environment variable to point to the Pico SDK directory
  if (process.env.PICO_SDK_DIR === undefined) {
    spinner.info('Setting PICO_SDK_DIR')
    process.env.PICO_SDK_DIR = PICO_SDK_DIR
    await upsert(EXPORTS_FILE_PATH, `export PICO_SDK_DIR=${PICO_SDK_DIR}`)
  } else {
    spinner.info(`Using existing $PICO_SDK_DIR: ${process.env.PICO_SDK_DIR}`)
  }

  // 4. Build some pico tools:
  if (
    filesystem.exists(PICO_SDK_BUILD_DIR) === false ||
    filesystem.list(PICO_SDK_BUILD_DIR)?.length === 0
  ) {
    spinner.start('Build some pico tools')
    filesystem.dir(PICO_SDK_BUILD_DIR)
    await system.exec('cmake ..', {
      shell: process.env.SHELL,
      stdout: process.stdout,
      cwd: PICO_SDK_BUILD_DIR,
    })
    await system.exec('make', {
      shell: process.env.SHELL,
      stdout: process.stdout,
      cwd: PICO_SDK_BUILD_DIR,
    })
    spinner.succeed()
  }

  // 5. Build _the_ picotool
  if (process.env.PICO_SDK_PATH === undefined) {
    spinner.info('Setting PICO_SDK_PATH')
    process.env.PICO_SDK_PATH = PICO_SDK_DIR
    await upsert(EXPORTS_FILE_PATH, `export PICO_SDK_PATH=${PICO_SDK_DIR}`)
  } else {
    spinner.info(`Using existing $PICO_SDK_PATH: ${process.env.PICO_SDK_PATH}`)
  }

  if (process.env.PIOASM === undefined) {
    spinner.info('Setting PIOASM')
    process.env.PIOASM = PIOASM_PATH
    await upsert(EXPORTS_FILE_PATH, `export PIOASM=${PIOASM_PATH}`)
  } else {
    spinner.info(`Using existing $PIOASM: ${process.env.PIOASM}`)
  }

  if (
    filesystem.exists(PICOTOOL_BUILD_DIR) === false ||
    filesystem.list(PICOTOOL_BUILD_DIR)?.length === 0
  ) {
    spinner.start('Build the picotool CLI')
    filesystem.dir(PICOTOOL_BUILD_DIR)
    await system.exec('cmake ..', {
      shell: process.env.SHELL,
      stdout: process.stdout,
      cwd: PICOTOOL_BUILD_DIR,
    })
    await system.exec('make', {
      shell: process.env.SHELL,
      stdout: process.stdout,
      cwd: PICOTOOL_BUILD_DIR,
    })
    await upsert(EXPORTS_FILE_PATH, `export PATH="${PICOTOOL_BUILD_DIR}:$PATH"`)
    spinner.succeed()
  }


  spinner.succeed(`
Successfully set up pico platform support for Moddable!
Test out the setup by starting a new terminal session and putting the device into programming mode by holding the BOOTSEL button when powering on the Pico
Then run: xs-dev run --example helloworld --device pico
  `)
}
