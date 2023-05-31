import type { GluegunCommand } from 'gluegun'
import { collectChoicesFromTree } from '../toolbox/prompt/choices'
import { sourceEnvironment } from '../toolbox/system/exec'

interface InitOptions {
  typescript?: boolean
  io?: boolean
  example?: string | boolean
  overwrite?: boolean,
  asyncMain?: boolean
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
      print: { warning, info, success },
      prompt,
    } = toolbox

    const name = parameters.first
    const {
      typescript = false,
      io = false,
      example = false,
      overwrite = false,
      asyncMain = false,
    }: InitOptions = parameters.options

    if (name !== undefined) {
      if (!overwrite && filesystem.isDirectory(name)) {
        warning(
          `Directory called ${name} already exists. Please pass the --overwrite flag to replace an existing project.`
        )
        process.exit(0)
      }

      await sourceEnvironment()

      if (example !== false) {
        // find example project
        const exampleProjectPath = filesystem.resolve(
          String(process.env.MODDABLE),
          'examples'
        )
        const examples = filesystem.inspectTree(exampleProjectPath)?.children
        const choices =
          examples !== undefined
            ? examples.map((example) => collectChoicesFromTree(example)).flat()
            : []
        let selectedExample = choices.find((choice) => choice === example)

        if (example === true || selectedExample === undefined) {
          const filteredChoices = choices.filter((choice) =>
            choice.includes(String(example))
          )
            ; ({ example: selectedExample } = await prompt.ask([
              {
                type: 'autocomplete',
                name: 'example',
                message: 'Here are the available examples templates:',
                choices: filteredChoices.length > 0 ? filteredChoices : choices,
              },
            ]))
        }

        // copy files into new project directory
        if (selectedExample !== '' && selectedExample !== undefined) {
          const selectedExamplePath = filesystem.resolve(
            exampleProjectPath,
            selectedExample
          )
          info(`Generating project directory from ${selectedExample}`)
          filesystem.copy(selectedExamplePath, name, { overwrite })
        } else {
          warning('Please select an example template to use.')
          process.exit(0)
        }
      } else {
        info(`Generating Moddable project: ${name}`)

        filesystem.dir(name, { empty: false })

        const includes = [
          io
            ? '"$(MODDABLE)/modules/io/manifest.json"'
            : '"$(MODDABLE)/examples/manifest_base.json"',
          typescript && '"$(MODDABLE)/examples/manifest_typings.json"',
        ]
          .filter(Boolean)
          .join(',\n\t')

        const defines: String = asyncMain
          ? ',\n  defines: {\n    async_main: 1\n  }'
          : ''

        await generate({
          template: 'manifest.json.ejs',
          target: `${name}/manifest.json`,
          props: { includes, defines },
        })

        await generate({
          template: 'main.js.ejs',
          target: `${name}/main.${typescript ? 'ts' : 'js'}`,
        })
      }

      success(`Run the project using: cd ${name} && xs-dev run`)
    } else {
      warning(
        'Name is required to generate project: xs-dev init my-project-name'
      )
    }
  },
}

export default command
