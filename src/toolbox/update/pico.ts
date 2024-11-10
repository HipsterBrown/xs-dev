import { print, filesystem, system } from 'gluegun'
import { type as platformType } from 'os'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from '../setup/constants'
import upsert from '../patching/upsert'
import { installDeps as installMacDeps } from '../setup/pico/mac'
import { installDeps as installLinuxDeps } from '../setup/pico/linux'
import { moddableExists } from '../setup/moddable'
import { sourceEnvironment } from '../system/exec'

export default async function (): Promise<void> {
  const OS = platformType().toLowerCase()
  const PICO_BRANCH = '2.0.0'
  const PICO_EXTRAS_REPO = 'https://github.com/raspberrypi/pico-extras'
  const PICO_ROOT =
    process.env.PICO_ROOT ?? filesystem.resolve(INSTALL_DIR, 'pico')
  const PICO_SDK_DIR = filesystem.resolve(PICO_ROOT, 'pico-sdk')
  const PICO_EXTRAS_DIR = filesystem.resolve(PICO_ROOT, 'pico-extras')
  const PICO_EXAMPLES_PATH = filesystem.resolve(PICO_ROOT, 'pico-examples')
  const PICOTOOL_PATH = filesystem.resolve(PICO_ROOT, 'picotool')
  const PICOTOOL_BUILD_DIR = filesystem.resolve(PICOTOOL_PATH, 'build')
  const PICO_SDK_BUILD_DIR = filesystem.resolve(PICO_SDK_DIR, 'build')

  await sourceEnvironment()

  const spinner = print.spin()
  spinner.start('Starting pico tooling update')

  // 0. ensure pico instal directory and Moddable exists
  if (!moddableExists()) {
    spinner.fail(
      'Moddable platform tooling required. Run `xs-dev setup` before trying again.',
    )
    process.exit(1)
  }

  spinner.info('Ensuring pico directory')
  if (
    filesystem.exists(PICO_ROOT) === false ||
    filesystem.exists(PICO_SDK_DIR) === false ||
    filesystem.exists(PICO_EXTRAS_DIR) === false ||
    filesystem.exists(PICO_EXAMPLES_PATH) === false ||
    filesystem.exists(PICOTOOL_PATH) === false
  ) {
    spinner.fail(
      'Pico tooling required. Run `xs-dev setup --device pico` before trying again.',
    )
    process.exit(1)
  } else {
    spinner.succeed('Found existing pico tooling!')
  }

  // 1. Install required components
  if (OS === 'darwin') {
    if (system.which('cmake') === null) {
      spinner.start('Cmake required, installing with Homebrew')
      await system.exec('brew install cmake')
      spinner.succeed()
    }

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

  // 2. Update the pico sdk, extras, examples, and picotool:
  if (filesystem.exists(PICO_SDK_DIR) === 'dir') {
    spinner.start('Updating pico-sdk repo')
    await system.spawn(`git fetch --all --tags`, { cwd: PICO_SDK_DIR })
    await system.spawn(`git checkout ${PICO_BRANCH}`, { cwd: PICO_SDK_DIR })
    await system.spawn(`git submodule update --init --recursive`, {
      cwd: PICO_SDK_DIR,
    })
    spinner.succeed()
  }

  if (filesystem.exists(PICO_EXTRAS_DIR) === 'dir') {
    spinner.start('Updating pico-extras repo')
    await system.exec(
      `git clone --depth 1 --single-branch -b sdk-${PICO_BRANCH} ${PICO_EXTRAS_REPO} ${PICO_EXTRAS_DIR}`,
      { stdout: process.stdout },
    )
    await system.spawn(`git fetch --all --tags`, { cwd: PICO_EXTRAS_DIR })
    await system.spawn(`git checkout sdk-${PICO_BRANCH}`, {
      cwd: PICO_EXTRAS_DIR,
    })
    spinner.succeed()
  }

  if (filesystem.exists(PICO_EXAMPLES_PATH) === 'dir') {
    spinner.start('Updating pico-examples repo')
    await system.spawn(`git fetch --all --tags`, { cwd: PICO_EXAMPLES_PATH })
    await system.spawn(`git checkout sdk-${PICO_BRANCH}`, {
      cwd: PICO_EXAMPLES_PATH,
    })
    spinner.succeed()
  }

  if (filesystem.exists(PICOTOOL_PATH) === 'dir') {
    spinner.start('Updating picotool repo')
    await system.spawn(`git fetch --all --tags`, { cwd: PICOTOOL_PATH })
    await system.spawn(`git checkout master`, { cwd: PICOTOOL_PATH })
    spinner.succeed()
  }

  // 4. Build some pico tools:
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

  // 5. Build _the_ picotool
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
  spinner.succeed()

  spinner.succeed(`
Successfully updated pico platform support for Moddable!
Test out the update by starting a new terminal session and putting the device into programming mode by holding the BOOTSEL button when powering on the Pico
Then run: xs-dev run --example helloworld --device pico
  `)
}
