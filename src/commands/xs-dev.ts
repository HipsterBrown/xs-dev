import { GluegunCommand } from 'gluegun'

const command: GluegunCommand = {
  name: 'xs-dev',
  description: 'CLI for automating the setup and usage of Moddable XS tools',
  run: async (toolbox) => {
    const { print } = toolbox

    print.info('Welcome to XS Dev! Run xs-dev --help to learn more.')
    print.printHelp(toolbox)
  },
}

export default command
