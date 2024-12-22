import { type as platformType } from 'node:os'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../cli'
import type { Device } from '../types'
import setupEjectfix from '../toolbox/setup/ejectfix'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'
import { MODDABLE_REPO } from '../toolbox/setup/constants'
import type { SetupArgs } from '../toolbox/setup/types'

interface SetupOptions {
  device?: Device
  'list-devices'?: boolean
  tool?: 'ejectfix'
  branch?: SetupArgs['branch']
  release?: SetupArgs['release']
  'source-repo'?: string
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
    } = flags
    let target: Device = device ?? DEVICE_ALIAS[currentPlatform]

    if (device === undefined && listDevices) {
      const choices = [
        'esp8266',
        'esp32',
        'pico',
        'wasm',
        'nrf52',
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
        process.exit(0)
      }
    }

    if (tool !== undefined) {
      if (!['ejectfix'].includes(tool)) {
        print.warning(`Unknown tool ${tool}`)
        process.exit(1)
      }
      if (tool === 'ejectfix') await setupEjectfix()
      return
    }
    const platformDevices: Device[] = [
      'mac',
      'darwin',
      'windows_nt',
      'win',
      'lin',
      'linux',
    ]
    const { default: setup } = await import(`../toolbox/setup/${target}`)
    if (platformDevices.includes(target)) {
      await setup({ branch, release, sourceRepo })
    } else {
      await setup({ branch, release })
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
        brief:
          'The remote branch to use as the source for Moddable SDK set up',
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
    },
  },
})

export default command
