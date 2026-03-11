import { execaCommand } from 'execa'
import { which } from '../../system/exec.js'
import type { Prompter } from '../../../lib/prompter.js'
import type { OperationEvent } from '../../../lib/events.js'

export async function* installPython(prompter: Prompter): AsyncGenerator<OperationEvent> {
  if (which('python') === null) {
    try {
      await execaCommand('where winget')
    } catch (error) {
      yield {
        type: 'info',
        message:
          'Python 2.7 is required. You can download it from python.org/downloads or install via Windows Package Manager (winget).',
      }
      yield {
        type: 'info',
        message:
          'Install winget from the Microsoft Store if needed, then re-run this setup.',
      }
      yield {
        type: 'step:fail',
        message: 'Python is required',
      }
      return
    }

    try {
      yield { type: 'step:start', message: 'Installing python from winget' }
      await execaCommand('winget install -e --id Python.Python.2 --silent')
      yield { type: 'step:done' }
      yield {
        type: 'info',
        message:
          'Python installed. Please close this window, launch a new Command Prompt, and re-run setup.',
      }
    } catch (error) {
      yield {
        type: 'step:fail',
        message: `Error installing Python: ${String(error)}`,
      }
    }
  }
}
