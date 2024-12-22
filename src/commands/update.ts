import { type as platformType } from 'node:os'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../cli'
import type { Device } from '../types'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'

interface UpdateOptions {
  device?: Device
  branch?: 'public' | string
  release?: 'latest' | string
}

const command = buildCommand({
  docs: {
    brief: 'Check and update Moddable tooling for various platform targets',
  },
  async func(this: LocalContext, flags: UpdateOptions) {
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device = DEVICE_ALIAS[currentPlatform],
      branch,
      release = 'latest',
    } = flags
    const { default: update } = await import(`../toolbox/update/${device}`)
    await update({ branch, release })
  },
  parameters: {
    flags: {
      device: {
        kind: 'enum',
        values: Object.keys(DEVICE_ALIAS) as NonNullable<Device[]>,
        brief:
          'Target device or platform SDK to set up; defaults to Moddable SDK for current OS',
        optional: true,
      },
      branch: {
        kind: 'parsed',
        parse: String,
        brief:
          'The remote branch to use as source for Moddable SDK update; overrides the --release flag',
        optional: true,
      },
      release: {
        kind: 'parsed',
        parse: String,
        brief:
          'The tagged release to use as source for Moddable SDK update; defaults to `latest`',
        optional: true,
      },
    },
  },
})

export default command
