import { system } from 'gluegun'
import type { GluegunPrint } from 'gluegun'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>
): Promise<void> {
  spinner.start('Installing python deps with apt-get')
  await system.exec(
    'sudo apt-get install python-is-python3 python3-pip python3-serial'
  )
  spinner.succeed()
}
