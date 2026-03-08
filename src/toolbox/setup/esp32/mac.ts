import { execSync } from 'node:child_process'
import { execaCommand } from '../../system/execa.js'
import { ensureHomebrew } from '../homebrew'
import type { OperationEvent } from '../../../lib/events.js'
import type { Prompter } from '../../../lib/prompter.js'

function which(bin: string): string | null {
  try {
    const result = execSync(`which ${bin}`, { stdio: 'pipe' }).toString().trim()
    return result.length > 0 ? result : null
  } catch {
    return null
  }
}

export async function* installDeps(prompter: Prompter): AsyncGenerator<OperationEvent> {
  try {
    for await (const event of ensureHomebrew(prompter)) {
      yield event
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      yield { type: 'info', message: `${error.message} python 3, cmake, ninja, dfu-util` }
      yield { type: 'step:fail', message: error.message }
    }
    return
  }

  const pythonPath = which('python')
  if (pythonPath === null) {
    const maybePython3Path = which('python3')

    if (maybePython3Path === null) {
      try {
        yield { type: 'step:start', message: 'Installing python through Homebrew' }
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

  if (which('cmake') === null) {
    try {
      yield { type: 'step:start', message: 'Installing cmake through Homebrew' }
      await execaCommand('brew install cmake', { shell: process.env.SHELL ?? '/bin/bash' })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error installing cmake: ${String(error)}` }
      return
    }
  }

  if (which('ninja') === null) {
    try {
      yield { type: 'step:start', message: 'Installing ninja through Homebrew' }
      await execaCommand('brew install ninja', { shell: process.env.SHELL ?? '/bin/bash' })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error installing ninja: ${String(error)}` }
      return
    }
  }

  if (which('dfu-util') === null) {
    try {
      yield { type: 'step:start', message: 'Installing dfu-util through Homebrew' }
      await execaCommand('brew install dfu-util', { shell: process.env.SHELL ?? '/bin/bash' })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error installing dfu-util: ${String(error)}` }
      return
    }
  }

  // 4. install pip, if needed
  const pip3Path = which('pip3')
  if (pip3Path === null) {
    try {
      yield { type: 'step:start', message: 'Ensuring pip is available' }
      await execaCommand('python3 -m ensurepip --user', {
        shell: process.env.SHELL ?? '/bin/bash',
      })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error installing pip: ${String(error)}` }
      return
    }
  }

  // 5. pip install pyserial, if needed
  try {
    yield { type: 'step:start', message: 'Installing pyserial through python3 -m pip' }
    await execaCommand('python3 -m pip install --user pyserial', {
      shell: process.env.SHELL ?? '/bin/bash',
    })
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'warning', message: 'Unable to install pyserial through the available Python environment. This may be required by the ESP-IDF. If you encounter issues, please try manually installing pyserial.' }
  }
}
