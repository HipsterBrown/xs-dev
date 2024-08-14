import { SerialPort } from 'serialport'
import { findBySerialNumber } from 'usb'
import type { GluegunCommand } from 'gluegun'
import type { XSDevToolbox } from '../types'
import { parseScanResult } from '../toolbox/scan/parse'
import { sourceEnvironment, sourceIdf } from '../toolbox/system/exec'

// eslint-disable-next-line
function sleep(timeout: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout)
  })
}

const command: GluegunCommand<XSDevToolbox> = {
  name: 'scan',
  description: 'Look for available devices',
  run: async (toolbox) => {
    const { filesystem, parameters, print, system } = toolbox
    if (parameters.options.help !== undefined) {
      print.printCommands(toolbox, ['scan'])
      process.exit(0)
    }

    const spinner = print.spin()

    await sourceEnvironment()

    if (typeof process.env.IDF_PATH === 'string' && filesystem.exists(process.env.IDF_PATH) === 'dir') {
      spinner.start(`Found ESP_IDF, sourcing environment...`)
      await sourceIdf()
      spinner.stop()
    }

    if (system.which('esptool.py') === null) {
      print.warning(
        'esptool.py required to scan for Espressif devices. Setup environment for ESP8266 or ESP32:\n xs-dev setup --device esp32\n xs-dev setup --device esp8266.'
      )
    }

    spinner.start('Scanning for devices...')

    const hasPicotool = system.which('picotool') !== null

    if (hasPicotool) {
      try {
        await system.exec('picotool reboot -fa')
        await sleep(1000)
      } catch { }
    }

    const ports = await SerialPort.list()
    const result: Array<
      [output: Buffer, port: string] | [output: undefined, port: string]
    > = await Promise.all(
      ports
        .filter((port) => port.serialNumber !== undefined)
        .map(async (port) => {
          try {
            if (
              port.manufacturer?.includes('Raspberry Pi') === true &&
              hasPicotool
            ) {
              const device = await findBySerialNumber(port.serialNumber ?? '')
              const bus = String(device?.busNumber)
              const address = String(device?.deviceAddress)
              return await system
                .exec(`picotool info --bus ${bus} --address ${address} -fa`)
                .then((buffer) => [buffer, port.path])
            }
            return await system
              .exec(`esptool.py --port ${port.path} read_mac`)
              .then((buffer) => [buffer, port.path])
          } catch { }
          return [undefined, port.path]
        })
    )

    const record = parseScanResult(result)
    const rows = Object.keys(record).map((port) => {
      const { device, features } = record[port]
      return [port, device, features]
    })

    if (rows.length === 0) {
      spinner.warn('No available devices found.')
    } else {
      spinner.succeed('Found the following available devices!')
      print.table([['Port', 'Device', 'Features'], ...rows])
    }
  },
}

export default command
