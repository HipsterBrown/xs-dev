import { type as platformType } from 'node:os'
import ora from 'ora'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../app.js'
import type { Device } from '../types.js'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices.js'
import { createInteractivePrompter, createNonInteractivePrompter, isInteractive } from '../lib/prompter.js'
import { handleEvent } from '../lib/renderer.js'
import type { OperationEvent } from '../lib/events.js'
import { getAdapter } from '../toolbox/adapters/registry.js'
import { getAdapterContext } from '../toolbox/adapters/context.js'

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

    const platformDevices = ['mac', 'lin', 'windows']
    const resolvedTarget = DEVICE_ALIAS[device]

    if (platformDevices.includes(resolvedTarget)) {
      const adapter = getAdapter('moddable')
      if (adapter === undefined) {
        console.warn('Moddable adapter not found')
        process.exit(1)
      }
      process.env.XS_DEV_RELEASE = release  // always set (has 'latest' default)
      if (branch !== undefined) process.env.XS_DEV_BRANCH = branch
      const ctx = getAdapterContext()
      const spinner = ora()
      try {
        for await (const event of adapter.update(ctx, prompter)) {
          handleEvent(event, spinner)
        }
      } finally {
        delete process.env.XS_DEV_BRANCH
        delete process.env.XS_DEV_RELEASE
      }
    } else {
      const deviceAdapter = getAdapter(resolvedTarget)
      const spinner = ora()
      if (deviceAdapter !== undefined) {
        const ctx = getAdapterContext()
        for await (const event of deviceAdapter.update(ctx, prompter)) {
          handleEvent(event, spinner)
        }
      } else {
        const { default: update } = await import(`../toolbox/update/${resolvedTarget}.js`)
        for await (const event of update({ branch, release }, prompter) as AsyncGenerator<OperationEvent>) {
          handleEvent(event, spinner)
        }
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
