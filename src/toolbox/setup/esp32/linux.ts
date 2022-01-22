import type { GluegunPrint } from 'gluegun'
import { execWithSudo } from '../../system/exec'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>
): Promise<void> {
  await execWithSudo(
    'apt-get install --yes git wget flex bison gperf python-is-python3 python3-pip python3-serial python-setuptools cmake ninja-build ccache libffi-dev libssl-dev dfu-util',
    { stdout: process.stdout }
  )
  spinner.succeed()
}
