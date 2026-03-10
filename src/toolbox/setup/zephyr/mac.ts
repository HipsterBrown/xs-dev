import { execaCommand } from '../../system/execa.js'
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
      yield { type: 'info', message: `${error.message} cmake, ninja, gperf, python3, python-tk, ccache, qemu, dtc, libmagic, wget, openocd` }
      yield { type: 'step:fail', message: `${error.message} cmake, ninja, gperf, python3, python-tk, ccache, qemu, dtc, libmagic, wget, openocd` }
    }
    return
  }

  try {
    yield { type: 'step:start', message: 'Installing zephyr dependencies' }
    await execaCommand('brew install cmake ninja gperf python3 python-tk ccache qemu dtc libmagic wget openocd', {
      shell: process.env.SHELL ?? '/bin/bash',
    })
    yield { type: 'step:done' }
  } catch (error: unknown) {
    yield { type: 'step:fail', message: `Error installing zephyr dependencies: ${String(error)}` }
  }
}
