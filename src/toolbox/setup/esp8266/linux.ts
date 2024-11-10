import type { GluegunPrint } from 'gluegun'
import { execWithSudo } from '../../system/exec'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>,
): Promise<void> {
  spinner.start('Installing python deps with apt-get')
  await execWithSudo(
    'apt-get install --yes python-is-python3 python3-pip python3-serial',
    { stdout: process.stdout },
  )
  spinner.succeed()
}
