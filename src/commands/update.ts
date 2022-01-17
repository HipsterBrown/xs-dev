import type { GluegunCommand } from 'gluegun'
import { type as platformType } from 'os'
import type { Device, XSDevToolbox } from '../types'

interface UpdateOptions {
  device?: Device
}

const command: GluegunCommand<XSDevToolbox> = {
  name: 'update',
  description: 'Check and update Moddable tooling for various platform targets',
  run: async ({ parameters, update }) => {
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const { device = currentPlatform }: UpdateOptions = parameters.options
    await update[device]()
  },
}

export default command
