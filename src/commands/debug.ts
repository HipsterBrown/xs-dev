import { type as platformType } from 'node:os'
import { resolve } from 'node:path'
import ora from 'ora'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../app'
import type { Device } from '../types'
import build from '../toolbox/build'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'
import { createInteractivePrompter, createNonInteractivePrompter } from '../lib/prompter'
import { isInteractive } from '../lib/output'

type Mode = 'development' | 'production'

interface DebugOptions {
  device?: string
  port?: string
  example?: string
  'list-examples'?: boolean
  'list-devices'?: boolean
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
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device = currentPlatform,
      port,
      example,
      'list-examples': listExamples = false,
      'list-devices': listDevices = false,
      log = false,
      mode = (process.env.NODE_ENV as Mode) ?? 'development',
      output,
    } = flags
    const targetPlatform: string = DEVICE_ALIAS[device as Device] ?? device
    projectPath = resolve(projectPath)

    // Determine interactive mode
    const prompter = isInteractive()
      ? createInteractivePrompter()
      : createNonInteractivePrompter()

    const spinner = ora()

    for await (const event of build(
      {
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
      },
      prompter,
    )) {
      switch (event.type) {
        case 'step:start':
          spinner.start(event.message)
          break
        case 'step:done':
          spinner.succeed(event.message ?? '')
          break
        case 'step:fail':
          spinner.fail(event.message)
          process.exit(1)
          break
        case 'warning':
          spinner.warn(event.message)
          break
        case 'info':
          spinner.info(event.message)
          break
      }
    }
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
        kind: 'parsed',
        parse: String,
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
      'list-examples': {
        kind: 'boolean',
        brief: 'Select an example project from an interactive list',
        optional: true,
      },
      'list-devices': {
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
