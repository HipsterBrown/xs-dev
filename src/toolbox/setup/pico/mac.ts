import { execaCommand } from '../../system/execa.js'
import { which } from '../../system/exec'
import { ensureHomebrew, formulaeExists } from '../homebrew'
import type { OperationEvent } from '../../../lib/events.js'
import type { Prompter } from '../../../lib/prompter.js'

export async function* installDeps(prompter: Prompter): AsyncGenerator<OperationEvent> {
  try {
    for await (const event of ensureHomebrew(prompter)) {
      yield event
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      yield { type: 'info', message: `${error.message} gcc-arm-embedded, libusb, pkg-config` }
      yield { type: 'step:fail', message: `${error.message} gcc-arm-embedded, libusb, pkg-config` }
    }
    return
  }

  if (
    which('arm-none-eabi-gcc') !== null &&
    (await formulaeExists('arm-none-eabi-gcc'))
  ) {
    try {
      yield { type: 'step:start', message: 'Removing outdated arm gcc dependency' }
      await execaCommand('brew untap ArmMbed/homebrew-formulae', { shell: process.env.SHELL ?? '/bin/bash' })
      await execaCommand('brew uninstall arm-none-eabi-gcc', { shell: process.env.SHELL ?? '/bin/bash' })
      yield { type: 'step:done' }
    } catch (error: unknown) {
      yield { type: 'warning', message: `Error removing outdated gcc: ${String(error)}` }
    }
  }

  try {
    yield { type: 'step:start', message: 'Installing pico tools dependencies' }
    await execaCommand('brew install libusb pkg-config', {
      shell: process.env.SHELL ?? '/bin/bash',
    })
    await execaCommand('brew install --cask gcc-arm-embedded', {
      shell: process.env.SHELL ?? '/bin/bash',
    })
    yield { type: 'step:done' }
  } catch (error: unknown) {
    yield { type: 'step:fail', message: `Error installing pico dependencies: ${String(error)}` }
  }
}
