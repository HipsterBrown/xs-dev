import type { GluegunCommand } from 'gluegun'
import { type as platformType } from 'os'
import type { Device, XSDevToolbox } from '../types'

interface SetupOptions {
  device?: Device
}

const command: GluegunCommand<XSDevToolbox> = {
  name: 'setup',
  description:
    'Download and build Moddable tooling for various platform targets',
  run: async ({ parameters, setup }) => {
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const { device = currentPlatform }: SetupOptions = parameters.options
    await setup[device]()
  },
}

export default command
