import { type as platformType } from 'node:os'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../cli'
import type { Device } from '../types'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'

type Mode = 'development' | 'production'

interface DebugOptions {
  device?: Device
  port?: string
  example?: string
  listExamples?: boolean
  listDevices?: boolean
  log?: boolean
  mode?: Mode
  output?: string
}

const command = buildCommand({
  docs: {
    brief: 'Connect to running debugging session on target device or simulator',
  },
  async func(
    this: LocalContext,
    flags: DebugOptions,
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    projectPath: string = '.',
  ) {
    const { filesystem } = this
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device = currentPlatform,
      port,
      example,
      listExamples = false,
      listDevices = false,
      log = false,
      mode = (process.env.NODE_ENV as Mode) ?? 'development',
      output,
    } = flags
    const { build } = await import('../toolbox/build/index')
    const targetPlatform: string = DEVICE_ALIAS[device] ?? device
    projectPath = filesystem.resolve(projectPath)

    await build({
      port,
      listExamples,
      listDevices,
      log,
      example,
      targetPlatform,
      projectPath,
      mode,
      deployStatus: 'debug',
      outputDir: output,
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
    },
    aliases: {
      d: 'device',
      m: 'mode',
      o: 'output',
    },
  },
})

export default command
