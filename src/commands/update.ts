import { type as platformType } from 'node:os'
import { buildCommand } from '@stricli/core'
import { LocalContext } from '../cli'
import type { Device } from '../types'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'

interface UpdateOptions {
  device?: Device
  targetBranch?: 'public' | 'latest-release'
}

const command = buildCommand({
  docs: {
    brief: 'Check and update Moddable tooling for various platform targets',
  },
  async func(this: LocalContext, flags: UpdateOptions) {
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device = currentPlatform,
      targetBranch = 'latest-release',
    } = flags
    const update = await import(`../toolbox/update/${device}`)
    await update({ targetBranch })
  },
  parameters: {
    flags: {
      device: {
        kind: 'enum',
        values: Object.keys(DEVICE_ALIAS) as NonNullable<Device[]>,
        brief: 'Target device or platform SDK to set up; defaults to Moddable SDK for current OS',
        optional: true,
      },
      targetBranch: {
        kind: 'enum',
        values: ['public', 'latest-release'],
        brief: 'The remote branch or release to use as source for Moddable SDK update; defaults to `latest-release`',
        optional: true,
      },
    }
  }
})

export default command
