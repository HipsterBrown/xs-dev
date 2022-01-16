import type { GluegunCommand } from 'gluegun'

interface InitOptions {
  typescript?: boolean
  io?: boolean
}

const command: GluegunCommand = {
  name: 'init',
  alias: ['i'],
  description: 'Scaffold a new Moddable XS project',
  run: async (toolbox) => {
    const {
      parameters,
      filesystem,
      template: { generate },
      print: { warning, spin },
    } = toolbox

    const name = parameters.first
    const { typescript = false, io = false }: InitOptions = parameters.options

    if (name !== undefined) {
      const spinner = spin()
      spinner.start(`Generating Moddable project: ${name}`)

      filesystem.dir(name)

      const includes = [
        io
          ? '$(MODDABLE)/modules/io/manifest.json'
          : '$(MODDABLE)/examples/manifest_base.json',
        typescript && '$(MODDABLE)/examples/manifest_typings.json',
      ].filter(Boolean)

      await generate({
        template: 'manifest.json.ejs',
        target: `${name}/manifest.json`,
        props: { includes },
      })

      await generate({
        template: 'main.js.ejs',
        target: `${name}/main.${typescript ? 'ts' : 'js'}`,
      })

      spinner.succeed()
    } else {
      warning(
        'Name is required to generate project: xs-dev init my-project-name'
      )
    }
  },
}

export default command
