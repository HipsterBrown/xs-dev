import { filesystem, print, system } from 'gluegun'
import type { GluegunPrint } from 'gluegun'
import { ensureHomebrew } from '../homebrew'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>
): Promise<void> {
  await ensureHomebrew()

  if (system.which('python') === null) {
    const maybePython3Path = system.which('python3')

    if (typeof maybePython3Path !== 'string') {
      spinner.start('Installing python from homebrew')
      try {
        await system.exec('brew install python', { shell: process.env.SHELL })
        spinner.succeed()
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('xcode-select')) {
          spinner.fail('Apple Command Line Tools must be installed in order to install python from Homebrew. Please run `xcode-select --install` before trying again.')
          process.exit(1)
        }
      }
    } else {
      try {
        filesystem.symlink(maybePython3Path, maybePython3Path.slice(0, -1))
      } catch (error) {
        print.info('Using existing python3 for python')
      }
    }
  }

  if (system.which('pip') === null || system.which('pip3') === null) {
    spinner.start('Installing pip through ensurepip')
    await system.exec('python3 -m ensurepip --user')
    spinner.succeed()
  }

  spinner.start('Installing pyserial through pip')
  await system.exec('python3 -m pip install pyserial')
  spinner.succeed()
}
