import { GluegunCommand } from 'gluegun'

const command: GluegunCommand = {
  name: 'xs-dev',
  run: async (toolbox) => {
    const { print } = toolbox

    print.info('Welcome to XS Dev! Run xs-dev --help to learn more.')
  },
}

export default command
