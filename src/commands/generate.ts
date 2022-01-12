import type { GluegunCommand } from 'gluegun'

const command: GluegunCommand = {
  name: 'generate',
  alias: ['g'],
  run: async (toolbox) => {
    const {
      parameters,
      template: { generate },
      print: { info },
    } = toolbox

    const name = parameters.first

    if (name !== undefined) {
      await generate({
        template: 'model.ts.ejs',
        target: `models/${name}-model.ts`,
        props: { name },
      })

      info(`Generated file at models/${name}-model.ts`)
    }
  },
}

export default command
