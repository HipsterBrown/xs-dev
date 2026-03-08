import { execaCommand } from '../../system/execa.js'
import type { OperationEvent } from '../../../lib/events.js'

export async function* installDeps(_prompter?: unknown): AsyncGenerator<OperationEvent> {
  yield { type: 'step:start', message: 'Downloading ESP-IDF Tools Installer' }
  try {
    await execaCommand('where winget')
  } catch (error) {
    yield { type: 'step:fail', message: 'winget is required to install dependencies for Zephyr tooling.' }
    yield { type: 'info', message: 'You can install winget via the App Installer package in the Microsoft Store.' }
    return
  }
  try {
    await execaCommand(
      'winget install Kitware.CMake Ninja-build.Ninja oss-winget.gperf Python.Python.3.12 Git.Git oss-winget.dtc wget 7zip.7zip',
      { stdio: 'inherit', shell: true },
    )
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error installing dependencies: ${String(error)}` }
  }
}

