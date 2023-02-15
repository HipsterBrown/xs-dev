import type { GluegunCommand } from 'gluegun'
import { type as platformType } from 'os'
import type { Device, XSDevToolbox } from '../types'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'

type Mode = 'development' | 'production'

interface BuildOptions {
  device?: Device
  port?: string
  example?: string
  listExamples?: boolean
  listDevices?: boolean
  mode?: Mode
  output?: string
  deploy?: boolean
  config?: object
}

const command: GluegunCommand<XSDevToolbox> = {
  name: 'build',
  description: 'Build project for release to target device',
  run: async ({ parameters, filesystem, build }) => {
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device = currentPlatform,
      port,
      example,
      listExamples = false,
      listDevices = false,
      mode = (process.env.NODE_ENV as Mode) ?? 'development',
      output = '',
      deploy = false,
      config = {}
    }: BuildOptions = parameters.options
    const targetPlatform: string = DEVICE_ALIAS[device] ?? device
    const projectPath = filesystem.resolve(parameters.first ?? '.')

    await build({
      port,
      listExamples,
      listDevices,
      example,
      targetPlatform,
      projectPath,
      mode,
      deployStatus: deploy ? 'push' : 'none',
      outputDir:
        output !== ''
          ? filesystem.resolve(output)
          : filesystem.resolve(String(process.env.MODDABLE), 'build'),
      config
    })
  },
}

export default command
