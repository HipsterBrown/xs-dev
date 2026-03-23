import { debuglog } from 'node:util'
import { execaCommand } from 'execa'
import { which } from '../../system/exec.js'
import { ensureHomebrew } from '../../setup/homebrew.js'
import type { OperationEvent } from '../../../lib/events.js'
import type { Prompter } from '../../../lib/prompter.js'

const debug = debuglog('xs-dev:toolchains:esp32:mac')

export async function* installMacDeps(prompter: Prompter): AsyncGenerator<OperationEvent> {
  try {
    for await (const event of ensureHomebrew(prompter)) {
      yield event
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      yield { type: 'step:fail', message: `${error.message} python 3, cmake, ninja, dfu-util` }
    }
    return
  }

  const missingDeps = Object.entries({
    python: ['python', 'python3'],
    cmake: ['cmake'],
    ninja: ['ninja'],
    'dfu-util': ['dfu-util'],
  }).reduce<string[]>((result, [dep, whichRefs]) => {
    if (whichRefs.some(ref => which(ref) === null)) return result.concat(dep)
    return result
  }, [])

  try {
    if (missingDeps.length > 0) {
      debug('Installing missing dependencies with Homebrew')
      await execaCommand(`brew install ${missingDeps.join(' ')}`, { shell: process.env.SHELL ?? '/bin/bash' })
      debug(`${missingDeps.join(' ')} dependencies installed`)
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('xcode-select')) {
      yield { type: 'step:fail', message: 'Apple Command Line Tools must be installed in order to install dependencies from Homebrew. Please run `xcode-select --install` before trying again.' }
    } else {
      yield { type: 'step:fail', message: `Error installing dependencies: ${String(error)}` }
    }
    return
  }

  if (which('pip3') === null) {
    try {
      debug('Installing pip through ensurepip')
      await execaCommand('python3 -m ensurepip --user', {
        shell: process.env.SHELL ?? '/bin/bash',
      })
      debug('pip installed')
    } catch (error: unknown) {
      yield { type: 'step:fail', message: `Error ensuring pip: ${String(error)}` }
      return
    }
  }

  try {
    debug('Installing pyserial through python3 -m pip')
    await execaCommand('python3 -m pip install --user pyserial', {
      shell: process.env.SHELL ?? '/bin/bash',
    })
    debug('Pyserial installed')
  } catch (error: unknown) {
    yield { type: 'warning', message: 'Unable to install pyserial through the available Python environment. This may be required by the ESP-IDF. If you encounter issues, please try manually installing pyserial.' }
  }
}
