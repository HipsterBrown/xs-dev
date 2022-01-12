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
  run: async ({ print, parameters, setup }) => {
    const { device = platformType().toLowerCase() as Device }: SetupOptions =
      parameters.options
    await setup[device]()
  },
}

export default command
