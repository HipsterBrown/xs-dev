import { type as platformType } from 'node:os'
import { buildCommand } from '@stricli/core'
import { LocalContext } from '../cli'
import type { Device } from '../types'
import setupEjectfix from '../toolbox/setup/ejectfix'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'
import { MODDABLE_REPO } from '../toolbox/setup/constants'
import type { SetupArgs, PlatformSetupArgs } from '../toolbox/setup/types'

interface SetupOptions {
  device?: Device
  listDevices?: boolean
  tool?: 'ejectfix'
  targetBranch?: SetupArgs['targetBranch']
  sourceRepo?: string
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
      listDevices = false,
      tool,
      targetBranch = 'latest-release',
      sourceRepo = MODDABLE_REPO,
    } = flags
    let target: Device = device ?? currentPlatform

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
    const platformDevices: Device[] = ['mac', 'darwin', 'windows_nt', 'win', 'lin', 'linux']
    const setup: (args: SetupArgs | PlatformSetupArgs) => Promise<void> = await import(`../commands/setup.ts/${target}`)
    if (platformDevices.includes(target)) {
      await setup({ targetBranch, sourceRepo })
    } else {
      await setup({ targetBranch })
    }
  },
  parameters: {
    flags: {
      device: {
        kind: 'enum',
        values: Object.keys(DEVICE_ALIAS) as NonNullable<Device[]>,
        brief: 'Target device or platform SDK to set up; defaults to Moddable SDK for current OS; use --list-devices for interactive selection',
        optional: true,
      },
      listDevices: {
        kind: 'boolean',
        brief: 'Select target device or platform SDK to set up from a list; defaults to false',
        optional: true,
      },
      tool: {
        kind: 'enum',
        values: ['ejectfix'],
        brief: 'Install additional tooling to support common development tasks',
        optional: true,
      },
      targetBranch: {
        kind: 'parsed',
        parse: String,
        brief: 'The remote branch or release to use as source for Moddable SDK set up; defaults to `latest-release`',
        optional: true,
      },
      sourceRepo: {
        kind: 'parsed',
        parse: String,
        brief: 'URL for remote repository to use as source for Moddable SDK set up; defaults to upstream project',
        optional: true,
      }
    }
  }
})

export default command
