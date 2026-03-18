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
import type { OperationEvent } from '../lib/events.js'
import { getAdapter } from '../toolbox/adapters/registry.js'
import { getAdapterContext } from '../toolbox/adapters/context.js'

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
      const adapter = getAdapter('moddable')
      if (adapter === undefined) {
        console.warn('Moddable adapter not found')
        process.exit(1)
      }
      // Pass branch/release/sourceRepo to adapter via env vars
      process.env.XS_DEV_RELEASE = release  // always set (has 'latest' default)
      if (sourceRepo !== undefined) process.env.XS_DEV_SOURCE_REPO = sourceRepo  // always set (has default)
      if (branch !== undefined) process.env.XS_DEV_BRANCH = branch
      const ctx = getAdapterContext()
      try {
        for await (const event of adapter.install(ctx, prompter)) {
          handleEvent(event, spinner)
        }
      } finally {
        delete process.env.XS_DEV_BRANCH
        delete process.env.XS_DEV_RELEASE
        delete process.env.XS_DEV_SOURCE_REPO
      }
    } else {
      const { default: setup } = await import(`../toolbox/setup/${target}.js`)
      for await (const event of setup({ branch, release }, prompter) as AsyncGenerator<OperationEvent>) {
        handleEvent(event, spinner)
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
