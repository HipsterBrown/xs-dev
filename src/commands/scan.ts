import type { GluegunCommand } from 'gluegun'
import type { XSDevToolbox } from '../types'

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

    const result = await system.exec(`esptool.py read_mac`)

    print.debug(result.toString())

    spinner.succeed('Found the following available devices!')
    print.table([['Device', 'Port']])
  },
}

export default command
