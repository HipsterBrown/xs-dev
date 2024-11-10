import type { GluegunPrint } from 'gluegun'
import { execWithSudo } from '../../system/exec'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>,
): Promise<void> {
  await execWithSudo(
    'apt-get install --yes cmake gcc-arm-none-eabi libnewlib-arm-none-eabi build-essential libusb-1.0.0-dev pkg-config',
    { stdout: process.stdout },
  )
  spinner.succeed()
}
