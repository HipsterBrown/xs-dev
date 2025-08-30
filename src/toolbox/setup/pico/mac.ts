import { type GluegunPrint, print, system } from 'gluegun'
import { ensureHomebrew, formulaeExists } from '../homebrew'
import { failure, successVoid } from '../../system/errors'
import type { SetupResult } from '../../../types'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>,
): Promise<SetupResult> {
  try {
    await ensureHomebrew()
  } catch (error: unknown) {
    if (error instanceof Error) {
      print.info(`${error.message} gcc-arm-embedded, libusb, pkg-config`)
      return failure(`${error.message} gcc-arm-embedded, libusb, pkg-config`)
    }
  }

  if (
    system.which('arm-none-eabi-gcc') !== null &&
    (await formulaeExists('arm-none-eabi-gcc'))
  ) {
    spinner.start('Removing outdated arm gcc dependency')
    await system.exec('brew untap ArmMbed/homebrew-formulae')
    await system.exec('brew uninstall arm-none-eabi-gcc')
    spinner.succeed()
  }

  spinner.start('Installing pico tools dependencies')
  await system.exec(`brew install libusb pkg-config`, {
    shell: process.env.SHELL,
  })
  await system.exec(`brew install --cask gcc-arm-embedded`, {
    shell: process.env.SHELL,
  })
  spinner.succeed()

  return successVoid()
}
