import type { GluegunCommand } from 'gluegun'
import { type as platformType } from 'os'
import type { Device, XSDevToolbox } from '../types'
import setupFontbm from '../toolbox/setup/fontbm'

interface SetupOptions {
  device?: Device
  listDevices?: boolean
}

const command: GluegunCommand<XSDevToolbox> = {
  name: 'setup',
  description:
    'Download and build Moddable tooling for various platform targets',
  run: async ({ parameters, setup, prompt, print }) => {
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const { device, listDevices = false }: SetupOptions = parameters.options
    let target: Device = device ?? currentPlatform

    if (device === undefined && listDevices) {
      const choices = ['esp8266', 'esp32', 'wasm', currentPlatform]
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

    if (parameters.options.tool) {
        console.log("setup tool");
        if ("fontbm" !== parameters.options.tool) {
          print.warning(`Unknown tool ${parameters.options.tool}`);
          process.exit(0);
        }
        await setupFontbm();
        return;
    }

    await setup[target]()
  },
}

export default command
