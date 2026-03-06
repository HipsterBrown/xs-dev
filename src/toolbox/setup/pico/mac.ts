import { execSync } from 'node:child_process'
import { execaCommand } from 'execa'
import { ensureHomebrew, formulaeExists } from '../homebrew'
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
      await execaCommand('brew untap ArmMbed/homebrew-formulae')
      await execaCommand('brew uninstall arm-none-eabi-gcc')
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error removing outdated dependency: ${String(error)}` }
    }
  }

  try {
    yield { type: 'step:start', message: 'Installing pico tools dependencies' }
    await execaCommand(`brew install libusb pkg-config`, {
      shell: process.env.SHELL ?? '/bin/bash',
    })
    await execaCommand(`brew install --cask gcc-arm-embedded`, {
      shell: process.env.SHELL ?? '/bin/bash',
    })
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error installing dependencies: ${String(error)}` }
  }
}
