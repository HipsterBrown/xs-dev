import type { GluegunCommand } from 'gluegun'
import { type as platformType } from 'os'
import type { Device, XSDevToolbox } from '../types'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'

type Mode = 'development' | 'production'

interface CleanOptions {
  device?: Device
  example?: string
  listExamples?: boolean
  listDevices?: boolean
  mode?: Mode
  output?: string
  config?: Record<string, string>
}

const command: GluegunCommand<XSDevToolbox> = {
  name: 'clean',
  description: 'Remove build artifacts for project',
  run: async ({ parameters, filesystem, build }) => {
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device = currentPlatform,
      example,
      listExamples = false,
      listDevices = false,
      mode = (process.env.NODE_ENV as Mode) ?? 'development',
      output,
      config = {}
    }: CleanOptions = parameters.options
    const targetPlatform: string = DEVICE_ALIAS[device] ?? device
    const projectPath = filesystem.resolve(parameters.first ?? '.')

    await build({
      listExamples,
      listDevices,
      example,
      targetPlatform,
      projectPath,
      mode,
      deployStatus: 'clean',
      outputDir: output,
      config
    })
  },
}

export default command

