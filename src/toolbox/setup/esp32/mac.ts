import { system, semver, print, filesystem } from 'gluegun'
import type { GluegunPrint } from 'gluegun'
import { ensureHomebrew } from '../homebrew'

// brew install python3, cmake, ninja, dfu-util
export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>
): Promise<void> {
  spinner.stop()

  await ensureHomebrew()

  if (
    system.which('python') === null ||
    // get python verion, check if v3
    semver.satisfies(
      (await system.exec('python --version', { trim: true }))
        .toString()
        .split(' ')
        .pop(),
      '>= 3.x.x'
    )
  ) {
    const maybePython3Path = system.which('python3')

    if (typeof maybePython3Path !== 'string') {
      try {
        await system.exec('brew install python', { shell: process.env.SHELL })
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('xcode-select')) {
          print.error('Apple Command Line Tools must be installed in order to install python from Homebrew. Please run `xcode-select --install` before trying again.')
          process.exit(1)
        }
      }
    } else {
      try {
        filesystem.symlink(maybePython3Path, maybePython3Path.slice(0, -1))
      } finally {
        print.info('Using existing python3 for python')
      }
    }
  }

  if (system.which('cmake') === null) {
    await system.exec('brew install cmake', { shell: process.env.SHELL })
  }

  if (system.which('ninja') === null) {
    await system.exec('brew install ninja', { shell: process.env.SHELL })
  }

  if (system.which('dfu-util') === null) {
    await system.exec('brew install dfu-util', { shell: process.env.SHELL })
  }

  // 4. install pip, if needed
  if (system.which('pip3') === null) {
    spinner.start('Installing pip3')
    await system.exec('python3 -m ensurepip --user', { shell: process.env.SHELL })
    spinner.succeed()
  }

  // 5. pip install pyserial, if needed
  spinner.start('Installing pyserial through pip3')
  await system.exec('python3 -m pip install pyserial', { shell: process.env.SHELL })
  spinner.succeed()
}
