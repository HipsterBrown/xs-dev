import { type as platformType } from 'node:os'
import ora from 'ora'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../app.js'
import type { Device } from '../types.js'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices.js'
import { createInteractivePrompter, createNonInteractivePrompter, isInteractive } from '../lib/prompter.js'
import { handleEvent } from '../lib/renderer.js'
import { getToolchain } from '../toolbox/toolchains/registry.js'
import { getHostContext } from '../toolbox/toolchains/context.js'

function buildVersionString(
  release: string | undefined,
  branch: string | undefined,
  sourceRepo: string | undefined,
): string | undefined {
  const prefix = branch !== undefined ? `branch-${branch}` : `release-${release ?? 'latest'}`
  return sourceRepo !== undefined ? `${prefix}@${sourceRepo}` : prefix
}

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
      const toolchain = getToolchain('moddable')
      if (toolchain === undefined) {
        console.warn('Moddable toolchain not found')
        process.exit(1)
      }
      const version = buildVersionString(release, branch, undefined)
      const ctx = { ...getHostContext(), version }
      const spinner = ora()
      for await (const event of toolchain.update(ctx, prompter)) {
        handleEvent(event, spinner)
      }
    } else {
      const deviceToolchain = getToolchain(resolvedTarget)
      const spinner = ora()
      if (deviceToolchain !== undefined) {
        const ctx = getHostContext()
        for await (const event of deviceToolchain.update(ctx, prompter)) {
          handleEvent(event, spinner)
        }
      } else {
        handleEvent({ type: 'step:fail', message: `No toolchain registered for device: ${resolvedTarget}` }, spinner)
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
