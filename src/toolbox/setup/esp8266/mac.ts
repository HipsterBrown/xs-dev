import { execaCommand } from 'execa'
import { which } from '../../system/exec.js'
import { ensureHomebrew } from '../homebrew.js'
import type { OperationEvent } from '../../../lib/events.js'
import type { Prompter } from '../../../lib/prompter.js'

export async function* installDeps(prompter: Prompter): AsyncGenerator<OperationEvent> {
  try {
    for await (const event of ensureHomebrew(prompter)) {
      yield event
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      yield { type: 'info', message: `${error.message} python` }
      yield { type: 'step:fail', message: `${error.message} python` }
    }
    return
  }

  if (which('python') === null) {
    const maybePython3Path = which('python3')

    if (maybePython3Path === null) {
      try {
        yield { type: 'step:start', message: 'Installing python from homebrew' }
        await execaCommand('brew install python', { shell: process.env.SHELL ?? '/bin/bash' })
        yield { type: 'step:done' }
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('xcode-select')) {
          yield { type: 'step:fail', message: 'Apple Command Line Tools must be installed in order to install python from Homebrew. Please run `xcode-select --install` before trying again.' }
        } else {
          yield { type: 'step:fail', message: `Error installing python: ${String(error)}` }
        }
        return
      }
    }
  }

  if (which('pip') === null || which('pip3') === null) {
    try {
      yield { type: 'step:start', message: 'Installing pip through ensurepip' }
      await execaCommand('python3 -m ensurepip --user', { shell: process.env.SHELL ?? '/bin/bash' })
      yield { type: 'step:done' }
    } catch (error: unknown) {
      yield { type: 'step:fail', message: `Error installing pip: ${String(error)}` }
      return
    }
  }

  try {
    yield { type: 'step:start', message: 'Installing pyserial through pip' }
    await execaCommand('python3 -m pip install pyserial', { shell: process.env.SHELL ?? '/bin/bash' })
    yield { type: 'step:done' }
  } catch (error: unknown) {
    yield { type: 'warning', message: `Error installing pyserial: ${String(error)}` }
  }
}
