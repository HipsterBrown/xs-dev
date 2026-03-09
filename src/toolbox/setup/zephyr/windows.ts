import { execaCommand } from '../../system/execa.js'
import type { Prompter } from '../../../lib/prompter.js'
import type { OperationEvent } from '../../../lib/events.js'

export async function* installDeps(prompter: Prompter): AsyncGenerator<OperationEvent> {
  yield { type: 'step:start', message: 'Installing Zephyr dependencies' }

  try {
    await execaCommand('where winget')
  } catch (error) {
    yield {
      type: 'info',
      message:
        'winget is required to install Zephyr dependencies. You can install it via the App Installer package in the Microsoft Store.',
    }
    yield {
      type: 'step:fail',
      message: 'winget is required to install dependencies for Zephyr tooling.',
    }
    return
  }

  try {
    await execaCommand(
      'winget install Kitware.CMake Ninja-build.Ninja oss-winget.gperf Python.Python.3.12 Git.Git oss-winget.dtc wget 7zip.7zip',
      { stdio: 'inherit', shell: true },
    )
    yield { type: 'step:done' }
  } catch (error) {
    yield {
      type: 'step:fail',
      message: `Error installing Zephyr dependencies: ${String(error)}`,
    }
  }
}
