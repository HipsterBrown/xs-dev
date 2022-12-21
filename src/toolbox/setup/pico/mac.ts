import type { GluegunPrint } from 'gluegun'
import { system } from 'gluegun'
import { ensureHomebrew } from '../homebrew';

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>
): Promise<void> {
  await ensureHomebrew()

  spinner.start('Tapping ArmMbed formulae and installing arm-embed-gcc')
  await system.exec('brew tap ArmMbed/homebrew-formulae')
  await system.exec(`brew install arm-none-eabi-gcc libusb pkg-config`)
  spinner.succeed()
}
