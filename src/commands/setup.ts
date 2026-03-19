import { type as platformType } from 'node:os'
import ora from 'ora'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../app.js'
import type { Device } from '../types.js'
import setupEjectfix from '../toolbox/setup/ejectfix.js'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices.js'
import type { SetupArgs } from '../toolbox/setup/types.js'
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

interface SetupOptions {
  device?: Device
  'list-devices'?: boolean
  tool?: 'ejectfix'
  branch?: SetupArgs['branch']
  release?: SetupArgs['release']
  'source-repo'?: string
  interactive?: boolean
}

const command = buildCommand({
  docs: {
    brief: 'Download and build Moddable tooling for various platform targets',
  },
  async func(this: LocalContext, flags: SetupOptions) {
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device,
      'list-devices': listDevices = false,
      tool,
      branch,
      release = 'latest',
      'source-repo': sourceRepo,
      interactive = true,
    } = flags

    // Determine interactive mode and create prompter
    const prompter = isInteractive(interactive)
      ? createInteractivePrompter()
      : createNonInteractivePrompter()

    let target: Device =
      DEVICE_ALIAS[device ?? ('' as Device)] ?? DEVICE_ALIAS[currentPlatform]

    if (device === undefined && listDevices) {
      const choices = [
        'esp8266',
        'esp32',
        'pico',
        'wasm',
        'nrf52',
        'zephyr',
        DEVICE_ALIAS[currentPlatform],
      ]
      const selectedDevice = await prompter.select(
        'Here are the available target devices:',
        choices.map((c) => ({ label: c, value: c })),
      )

      if (selectedDevice !== '' && selectedDevice !== undefined) {
        target = selectedDevice as Device
      } else {
        console.warn('Please select a target device to run')
        return
      }
    }

    if (tool !== undefined) {
      if (!['ejectfix'].includes(tool)) {
        console.warn(`Unknown tool ${tool}`)
        process.exit(1)
      }
      if (tool === 'ejectfix') {
        const spinner = ora()
        for await (const event of setupEjectfix({}, prompter)) {
          handleEvent(event, spinner)
        }
      }
      return
    }

    const platformDevices: Device[] = [
      'mac',
      'darwin',
      'windows_nt',
      'windows',
      'win',
      'lin',
      'linux',
    ]

    const spinner = ora()

    if (platformDevices.includes(target)) {
      const toolchain = getToolchain('moddable')
      if (toolchain === undefined) {
        console.warn('Moddable toolchain not found')
        process.exit(1)
      }
      const version = buildVersionString(release, branch, sourceRepo)
      const ctx = { ...getHostContext(), version }
      for await (const event of toolchain.install(ctx, prompter)) {
        handleEvent(event, spinner)
      }
    } else {
      const toolchain = getToolchain(target)
      if (toolchain !== undefined) {
        const ctx = getHostContext()
        for await (const event of toolchain.install(ctx, prompter)) {
          handleEvent(event, spinner)
        }
      } else {
        handleEvent({ type: 'step:fail', message: `No toolchain registered for device: ${target}` }, spinner)
      }
    }
  },
  parameters: {
    flags: {
      device: {
        kind: 'enum',
        values: Object.keys(DEVICE_ALIAS) as NonNullable<Device[]>,
        brief:
          'Target device or platform SDK to set up; defaults to Moddable SDK for current OS; use --list-devices for interactive selection',
        optional: true,
      },
      'list-devices': {
        kind: 'boolean',
        brief:
          'Select target device or platform SDK to set up from a list; defaults to false',
        optional: true,
      },
      tool: {
        kind: 'enum',
        values: ['ejectfix'],
        brief: 'Install additional tooling to support common development tasks',
        optional: true,
      },
      branch: {
        kind: 'parsed',
        parse: String,
        brief: 'The remote branch to use as the source for Moddable SDK set up',
        optional: true,
      },
      release: {
        kind: 'parsed',
        parse: String,
        brief:
          'The release tag to use as the source for Moddable SDK set up; defaults to `latest`',
        optional: true,
      },
      'source-repo': {
        kind: 'parsed',
        parse: String,
        brief:
          'URL for remote repository to use as source for Moddable SDK set up; defaults to upstream project',
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
