import { system } from 'gluegun'
import type { GluegunPrint } from 'gluegun'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>
): Promise<void> {
  if (system.which('python') === null) {
    spinner.start('Installing python from homebrew')
    await system.exec('brew install python')
    spinner.succeed()
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
