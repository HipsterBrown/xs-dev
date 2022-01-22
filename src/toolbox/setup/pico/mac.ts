import type { GluegunPrint } from 'gluegun'
import { system } from 'gluegun'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>
): Promise<void> {
  await system.exec('brew tap ArmMbed/homebrew-formulae')
  await system.exec(`brew install arm-none-eabi-gcc`)
  spinner.succeed()
}
