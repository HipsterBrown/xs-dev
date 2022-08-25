import type { GluegunCommand } from 'gluegun'
import { type as platformType } from 'os'
import type { Device, XSDevToolbox } from '../types'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'

type Mode = 'development' | 'production'

interface RunOptions {
  device?: Device
  port?: string
  example?: string
  listExamples?: boolean
  listDevices?: boolean
  mode?: Mode
  output?: string
}

const command: GluegunCommand<XSDevToolbox> = {
  name: 'run',
  description: 'Build and launch project on target device or simulator',
  run: async ({ parameters, filesystem, build }) => {
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device = currentPlatform,
      port,
      example,
      listExamples = false,
      listDevices = false,
      mode = (process.env.NODE_ENV as Mode) ?? 'development',
      output = filesystem.resolve(String(process.env.MODDABLE), 'build'),
    }: RunOptions = parameters.options
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
      deployStatus: 'run',
      outputDir: output,
    })
  },
}

export default command
