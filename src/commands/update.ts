import type { GluegunCommand } from 'gluegun'
import { type as platformType } from 'os'
import type { Device, XSDevToolbox } from '../types'

interface UpdateOptions {
  device?: Device
  targetBranch?: 'public' | 'latest-release'
}

const command: GluegunCommand<XSDevToolbox> = {
  name: 'update',
  description: 'Check and update Moddable tooling for various platform targets',
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  run: async ({ parameters, update }) => {
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device = currentPlatform,
      targetBranch = 'latest-release',
    }: UpdateOptions = parameters.options
    await update[device]({ targetBranch })
  },
}

export default command
