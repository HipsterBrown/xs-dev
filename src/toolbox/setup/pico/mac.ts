import { GluegunPrint, print, system } from 'gluegun'
import { ensureHomebrew } from '../homebrew';

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>
): Promise<void> {
  try {
    await ensureHomebrew()
  } catch (error: unknown) {
    if (error instanceof Error) {
      print.info(`${error.message} arm-none-eabi-gcc, libusb, pkg-config`)
      process.exit(1);
    }
  }

  spinner.start('Tapping ArmMbed formulae and installing arm-embed-gcc')
  await system.exec('brew tap ArmMbed/homebrew-formulae', { shell: process.env.SHELL })
  await system.exec(`brew install arm-none-eabi-gcc libusb pkg-config`, { shell: process.env.SHELL })
  spinner.succeed()
}
