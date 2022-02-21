import { SerialPort } from 'serialport'
import type { GluegunCommand } from 'gluegun'
import type { XSDevToolbox } from '../types'
import { parseScanResult } from '../toolbox/scan/parse'

const command: GluegunCommand<XSDevToolbox> = {
  name: 'scan',
  description: 'Look for available devices',
  run: async (toolbox) => {
    const { parameters, print, system } = toolbox
    if (parameters.options.help !== undefined) {
      print.printCommands(toolbox, ['scan'])
      process.exit(0)
    }

    const spinner = print.spin()

    spinner.start('Scanning for devices...')

    const ports = await SerialPort.list()
    const result = await Promise.all<Buffer[]>(
      ports
        .filter((port) => port.serialNumber !== undefined)
        .map((port) => system.exec(`esptool.py --port ${port.path} read_mac`))
    )

    const record = parseScanResult(result.map(String).join('\n'))
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
