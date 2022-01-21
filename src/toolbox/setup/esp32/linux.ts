import { system } from 'gluegun'
import type { GluegunPrint } from 'gluegun'

export async function installDeps (spinner: ReturnType<GluegunPrint['spin']>): Promise<void> {
    await system.exec(
      'sudo apt-get install git wget flex bison gperf python-is-python3 python3-pip python3-serial python-setuptools cmake ninja-build ccache libffi-dev libssl-dev dfu-util',
      { stdout: process.stdout }
    )
    spinner.succeed()
}
