import type { GluegunPrint } from 'gluegun'
import { system } from 'gluegun'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>
): Promise<void> {
  if (system.which('brew') === null) {
    print.error(`Homebrew is required to install necessary dependencies. Visit https://brew.sh/ to learn more about installing Homebrew.
  If you don't want to use Homebrew, please install python, cmake, ninja, and dfu-util manually before trying this command again.`)
    process.exit(1);
  }

  await system.exec('brew tap ArmMbed/homebrew-formulae')
  await system.exec(`brew install arm-none-eabi-gcc libusb pkg-config`)
  spinner.succeed()
}
