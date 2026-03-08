import { execSync } from 'node:child_process'
import { execaCommand } from '../../system/execa.js'
import type { OperationEvent } from '../../../lib/events.js'

function which(bin: string): string | null {
  try {
    const result = execSync(`where ${bin}`, { stdio: 'pipe' }).toString().trim()
    return result.length > 0 ? result : null
  } catch {
    return null
  }
}

export async function* installPython(_prompter?: unknown): AsyncGenerator<OperationEvent> {
  if (which('python') === null) {
    // For some reason, which does not work with winget. This is a workaround for now.
    try {
      await execaCommand('where winget')
    } catch (error) {
      yield { type: 'step:fail', message: 'Python 2.7 is required.' }
      yield { type: 'info', message: 'You can download and install Python from python.org/downloads' }
      yield { type: 'info', message: 'Or xs-dev can manage installing Python and other dependencies using the Windows Package Manager Client (winget).' }
      yield { type: 'info', message: 'You can install winget via the App Installer package in the Microsoft Store.' }
      yield { type: 'info', message: 'Please install either Python or winget, then launch a new Command Prompt and re-run this setup.' }
      return
    }

    try {
      yield { type: 'step:start', message: 'Installing python from winget' }
      await execaCommand('winget install -e --id Python.Python.2 --silent')
      yield { type: 'step:done' }
      yield { type: 'info', message: 'Python successfully installed. Please close this window and launch a new Moddable Command Prompt to refresh environment variables, then re-run this setup.' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error installing python: ${String(error)}` }
    }
  }
}
