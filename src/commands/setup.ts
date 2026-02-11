import { type as platformType } from 'node:os'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../app'
import type { Device, SetupResult } from '../types'
import setupEjectfix from '../toolbox/setup/ejectfix'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'
import { MODDABLE_REPO } from '../toolbox/setup/constants'
import type { SetupArgs } from '../toolbox/setup/types'
import { isFailure } from '../toolbox/system/errors'

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
        print.warning('Please select a target device to run')
        return
      }
    }

    if (tool !== undefined) {
      if (!['ejectfix'].includes(tool)) {
        print.warning(`Unknown tool ${tool}`)
        process.exit(1)
      }
      if (tool === 'ejectfix') {
        const result = await setupEjectfix()
        if (isFailure(result)) {
          print.error(result.error)
          process.exit(1)
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

    if (platformDevices.includes(target)) {
      const result = await setup({
        branch,
        release,
        sourceRepo,
        interactive:
          typeof process.env.CI !== 'undefined'
            ? process.env.CI === 'false'
            : interactive,
      }) as SetupResult
      if (isFailure(result)) {
        print.error(result.error)
        process.exit(1)
      }
    } else {
      const result = await setup({ branch, release }) as SetupResult
      if (isFailure(result)) {
        print.error(result.error)
        process.exit(1)
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
