import { print, system } from 'gluegun'
import type { GluegunPrint } from 'gluegun'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>
): Promise<void> {
  if (system.which('python') === null) {
    if (system.which('brew') === null) {
      print.error(`Homebrew is required to install necessary dependencies. Visit https://brew.sh/ to learn more about installing Homebrew.
  If you don't want to use Homebrew, please install python manually before trying this command again.`)
      process.exit(1);
    }

    spinner.start('Installing python from homebrew')
    try {
      await system.exec('brew install python')
      spinner.succeed()
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('xcode-select')) {
        spinner.fail('Apple Command Line Tools must be installed in order to install python from Homebrew. Please run `xcode-select --install` before trying again.')
        process.exit(1)
      }
    }
  }

  if (system.which('pip') === null) {
    spinner.start('Installing pip through ensurepip')
    await system.exec('python -m ensurepip')
    spinner.succeed()
  }

  spinner.start('Installing pyserial through pip')
  await system.exec('python -m pip install pyserial')
  spinner.succeed()
}
