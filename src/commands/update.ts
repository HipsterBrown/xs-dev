import { type as platformType } from 'node:os'
import ora from 'ora'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../app'
import type { Device } from '../types'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'
import { createInteractivePrompter, createNonInteractivePrompter } from '../lib/prompter'
import { isInteractive } from '../lib/output'
import type { OperationEvent } from '../lib/events'

interface UpdateOptions {
  device?: Device
  branch?: 'public' | string
  release?: 'latest' | string
  interactive?: boolean
}

const command = buildCommand({
  docs: {
    brief: 'Check and update Moddable tooling for various platform targets',
  },
  async func(this: LocalContext, flags: UpdateOptions) {
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device = currentPlatform,
      branch,
      release = 'latest',
      interactive = true,
    } = flags

    const prompter = isInteractive(interactive)
      ? createInteractivePrompter()
      : createNonInteractivePrompter()


    const { default: update } = await import(
      `../toolbox/update/${DEVICE_ALIAS[device]}`
    )

    const spinner = ora()

    for await (const event of update({ branch, release }, prompter) as AsyncGenerator<OperationEvent>) {
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
    flags: {
      device: {
        kind: 'enum',
        values: Object.keys(DEVICE_ALIAS) as NonNullable<Device[]>,
        brief:
          'Target device or platform SDK to set up; defaults to Moddable SDK for current OS',
        optional: true,
      },
      branch: {
        kind: 'parsed',
        parse: String,
        brief:
          'The remote branch to use as source for Moddable SDK update; overrides the --release flag',
        optional: true,
      },
      release: {
        kind: 'parsed',
        parse: String,
        brief:
          'The tagged release to use as source for Moddable SDK update; defaults to `latest`',
        optional: true,
      },
      interactive: {
        kind: 'boolean',
        brief:
          'Choose whether to show any prompts or automatically accept them; defaults to true unless CI environment variable is true.',
        optional: true,
      },
    },
  },
})

export default command
