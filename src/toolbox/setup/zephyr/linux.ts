import type { GluegunPrint } from 'gluegun'
import { execWithSudo } from '../../system/exec'
import { successVoid, isFailure } from '../../system/errors'
import type { SetupResult } from '../../../types'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>,
): Promise<SetupResult> {
  const result = await execWithSudo(
    `apt-get install --yes \
cmake gcc-arm-none-eabi libnewlib-arm-none-eabi build-essential libusb-1.0.0-dev pkg-config \
xz-utils file make gcc gcc-multilib g++-multilib libsdl2-dev libmagic1`,
    { stdout: process.stdout },
  )
  if (isFailure(result)) return result
  spinner.succeed()

  return successVoid()
}
