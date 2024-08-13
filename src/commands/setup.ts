import type { GluegunCommand } from 'gluegun'
import { type as platformType } from 'os'
import type { Device, XSDevToolbox } from '../types'
import setupEjectfix from '../toolbox/setup/ejectfix'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'
import { MODDABLE_REPO } from '../toolbox/setup/constants'
import { SetupArgs } from '../toolbox/setup/types'

interface SetupOptions {
  device?: Device
  listDevices?: boolean
  tool?: 'ejectfix'
  targetBranch?: SetupArgs['targetBranch']
  sourceRepo?: string
}

const command: GluegunCommand<XSDevToolbox> = {
  name: 'setup',
  description:
    'Download and build Moddable tooling for various platform targets',
  run: async ({ parameters, setup, prompt, print }) => {
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device,
      listDevices = false,
      tool,
      targetBranch = 'latest-release',
      sourceRepo = MODDABLE_REPO,
    }: SetupOptions = parameters.options
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
    if (platformDevices.includes(target)) {
      await setup[target]({ targetBranch, sourceRepo })
    } else {
      await setup[target]({ targetBranch })
    }
  },
}

export default command
