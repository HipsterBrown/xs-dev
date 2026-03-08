import { type as platformType } from 'node:os'
import ora from 'ora'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../app'
import type { Device } from '../types'
import setupEjectfix from '../toolbox/setup/ejectfix'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'
import { MODDABLE_REPO } from '../toolbox/setup/constants'
import type { SetupArgs } from '../toolbox/setup/types'
import { createInteractivePrompter, createNonInteractivePrompter } from '../lib/prompter'

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
    const { prompt, print } = this
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device,
      'list-devices': listDevices = false,
      tool,
      branch,
      release = 'latest',
      'source-repo': sourceRepo = MODDABLE_REPO,
      interactive = true,
    } = flags

    // Determine interactive mode and create prompter early for ejectfix
    const isInteractive =
      typeof process.env.CI !== 'undefined'
        ? process.env.CI === 'false'
        : interactive

    const prompter = isInteractive
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
      const { device: selectedDevice } = await prompt.ask([
        {
          type: 'autocomplete',
          name: 'device',
          message: 'Here are the available target devices:',
          choices,
        },
      ])

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
        const spinners = new Map<string, ReturnType<typeof ora>>()
        for await (const event of setupEjectfix({}, prompter)) {
          const key = event.taskId ?? 'default'
          if (!spinners.has(key)) spinners.set(key, ora())
          const spinner = spinners.get(key)!

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
    const { default: setup } = await import(`../toolbox/setup/${target}`)

    // Create spinner map for parallel support
    const spinners = new Map<string, ReturnType<typeof ora>>()

    if (platformDevices.includes(target)) {
      for await (const event of setup({ branch, release, sourceRepo }, prompter)) {
        const key = event.taskId ?? 'default'
        if (!spinners.has(key)) spinners.set(key, ora())
        const spinner = spinners.get(key)!

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
    } else {
      for await (const event of setup({ branch, release }, prompter)) {
        const key = event.taskId ?? 'default'
        if (!spinners.has(key)) spinners.set(key, ora())
        const spinner = spinners.get(key)!

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
