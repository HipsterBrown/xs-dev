import { system, semver, print } from 'gluegun'
import type { GluegunPrint } from 'gluegun'
import { ensureHomebrew } from '../homebrew'

// brew install python3, cmake, ninja, dfu-util
export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>,
): Promise<void> {
  spinner.stop()

  try {
    await ensureHomebrew()
  } catch (error: unknown) {
    if (error instanceof Error) {
      print.info(`${error.message} python 3, cmake, ninja, dfu-util`)
      process.exit(1)
    }
  }

  if (
    system.which('python') === null ||
    // get python version, check if v3
    semver.satisfies(
      (
        (
          await system.exec('python --version', { trim: true })
        ).toString() as string
      )
        .split(' ')
        .pop() ?? '',
      '>= 3.x.x',
    )
  ) {
    const maybePython3Path = system.which('python3')

    if (typeof maybePython3Path !== 'string') {
      try {
        spinner.start('Installing python through Homebrew')
        await system.exec('brew install python', { shell: process.env.SHELL })
        spinner.succeed()
      } catch (error: unknown) {
        spinner.fail()
        if (error instanceof Error && error.message.includes('xcode-select')) {
          print.error(
            'Apple Command Line Tools must be installed in order to install python from Homebrew. Please run `xcode-select --install` before trying again.',
          )
          process.exit(1)
        }
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
    spinner.start('Ensuring pip is available')
    await system.exec('python3 -m ensurepip --user', {
      shell: process.env.SHELL,
    })
    spinner.succeed()
  }

  // 5. pip install pyserial, if needed
  try {
    spinner.start('Installing pyserial through python3 -m pip')
    await system.exec('python3 -m pip install --user pyserial', {
      shell: process.env.SHELL,
    })
    spinner.succeed()
  } catch (error: unknown) {
    spinner.fail()
    print.error(
      'Unable to install pyserial through the availble Python environment. This may be required by the ESP-IDF. If you encounter issues, please try manually installing pyserial.',
    )
  }
}
