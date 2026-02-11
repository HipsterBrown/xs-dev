import { type GluegunPrint, print, system } from 'gluegun'
import { ensureHomebrew } from '../homebrew'
import { failure, successVoid } from '../../system/errors'
import type { SetupResult } from '../../../types'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>,
): Promise<SetupResult> {
  try {
    await ensureHomebrew()
  } catch (error: unknown) {
    if (error instanceof Error) {
      print.info(`${error.message} cmake, ninja, gperf, python3, python-tk, ccache, qemu, dtc, libmagic, wget, openocd`)
      return failure(`${error.message} cmake, ninja, gperf, python3, python-tk, ccache, qemu, dtc, libmagic, wget, openocd`)
    }
  }

  spinner.start('Installing zephyr dependencies')
  await system.exec(`brew install cmake ninja gperf python3 python-tk ccache qemu dtc libmagic wget openocd`, {
    shell: process.env.SHELL,
  })
  spinner.succeed()

  return successVoid()
}

