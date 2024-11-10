import { type as platformType } from 'node:os'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../cli'
import type { Device } from '../types'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'

type Mode = 'development' | 'production'

interface CleanOptions {
  device?: Device
  example?: string
  listExamples?: boolean
  listDevices?: boolean
  mode?: Mode
  output?: string
  config?: string[]
}

const command = buildCommand({
  docs: {
    brief: 'Remove build artifacts for project',
  },
  async func(
    this: LocalContext,
    flags: CleanOptions,
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    projectPath: string = '.',
  ) {
    const { filesystem } = this
    const { build } = await import('../toolbox/build/index')
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device = currentPlatform,
      example,
      listExamples = false,
      listDevices = false,
      mode = (process.env.NODE_ENV as Mode) ?? 'development',
      output,
      config = [],
    } = flags
    const targetPlatform: string = DEVICE_ALIAS[device] ?? device
    projectPath = filesystem.resolve(projectPath)
    const parsedConfig = config.reduce<Record<string, string>>(
      (result, setting) => {
        const [key, value] = setting.split('=')
        result[key] = value
        return result
      },
      {},
    )

    await build({
      listExamples,
      listDevices,
      example,
      targetPlatform,
      projectPath,
      mode,
      deployStatus: 'clean',
      outputDir: output,
      config: parsedConfig,
    })
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [
        {
          placeholder: 'projectPath',
          brief: 'Path to project; defaults to current directory',
          parse: String,
          default: '.',
          optional: true,
        },
      ],
    },
    flags: {
      device: {
        kind: 'enum',
        values: Object.keys(DEVICE_ALIAS) as NonNullable<Device[]>,
        brief:
          'Target device or platform for the project, use --list-devices to select from interactive list; defaults to current OS simulator',
        optional: true,
      },
      example: {
        kind: 'parsed',
        parse: String,
        brief:
          'Name of example project to run, use --list-examples to select from an interactive list',
        optional: true,
      },
      listExamples: {
        kind: 'boolean',
        brief: 'Select an example project from an interactive list',
        optional: true,
      },
      listDevices: {
        kind: 'boolean',
        brief: 'Select a target device or platform from an interactive list',
        optional: true,
      },
      mode: {
        kind: 'enum',
        values: ['development', 'production'],
        brief: 'Set the current build context; defaults to development',
        optional: true,
      },
      output: {
        kind: 'parsed',
        parse: String,
        brief:
          'Output directory for build result; defaults to internal $MODDABLE build directory for project',
        optional: true,
      },
      config: {
        kind: 'parsed',
        parse: String,
        brief: 'Extra configuration options to provide to build',
        optional: true,
        variadic: true,
      },
    },
    aliases: {
      d: 'device',
      m: 'mode',
      o: 'output',
    },
  },
})

export default command
