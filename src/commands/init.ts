import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../cli'
import { collectChoicesFromTree } from '../toolbox/prompt/choices'
import { sourceEnvironment } from '../toolbox/system/exec'

interface InitOptions {
  typescript?: boolean
  io?: boolean
  manifest?: boolean
  example?: string
  'list-examples'?: boolean
  overwrite?: boolean
  asyncMain?: boolean
}

const command = buildCommand({
  docs: {
    brief: 'Scaffold a new Moddable XS project',
  },
  async func(this: LocalContext, flags: InitOptions, projectName: string) {
    const {
      filesystem,
      print: { warning, info, success },
      prompt,
    } = this

    const {
      typescript = false,
      io = true,
      manifest = false,
      example,
      'list-examples': listExamples = false,
      overwrite = false,
      asyncMain = false,
    } = flags

    if (projectName !== undefined) {
      if (!overwrite && filesystem.isDirectory(projectName)) {
        warning(
          `Directory called ${projectName} already exists. Please pass the --overwrite flag to replace an existing project.`,
        )
        process.exit(0)
      }

      await sourceEnvironment()

      if (example !== undefined || listExamples) {
        // find example project
        const exampleProjectPath = filesystem.resolve(
          String(process.env.MODDABLE),
          'examples',
        )
        const examples = filesystem.inspectTree(exampleProjectPath)?.children
        const choices =
          examples !== undefined
            ? examples.map((example) => collectChoicesFromTree(example)).flat()
            : []
        let selectedExample = choices.find((choice) => choice === example)

        if (listExamples || selectedExample === undefined) {
          const filteredChoices = choices.filter((choice) =>
            choice.includes(String(example)),
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
            selectedExample,
          )
          info(`Generating project directory from ${selectedExample}`)
          filesystem.copy(selectedExamplePath, projectName, { overwrite })
        } else {
          warning('Please select an example template to use.')
          process.exit(0)
        }
      } else {
        info(`Generating Moddable project: ${projectName}`)

        filesystem.dir(projectName, { empty: false })

        const includes = [
          io
            ? [
              '"$(MODDABLE)/modules/io/manifest.json"',
              '"$(MODDABLE)/examples/manifest_net.json"',
            ]
            : '"$(MODDABLE)/examples/manifest_base.json"',
          typescript && '"$(MODDABLE)/examples/manifest_typings.json"',
        ]
          .filter(Boolean)
          .flat()
          .join(',\n\t')

        const defines: string = asyncMain
          ? ',\n  defines: {\n    async_main: 1\n  }'
          : ''

        const { createManifest, createMain, createPackageJSON, createTSConfig } = await import(
          '../toolbox/init/templates'
        )

        const fileTasks = [createMain({
          target: `${projectName}/main.${typescript ? 'ts' : 'js'}`,
          legacy: manifest,
        })]

        if (manifest) {
          fileTasks.push(createManifest({
            target: `${projectName}/manifest.json`,
            includes,
            defines,
          }))
        } else {
          fileTasks.push(createPackageJSON({ target: `${projectName}/package.json`, projectName, typescript }))
        }

        if (typescript) {
          fileTasks.push(createTSConfig({ target: `${projectName}/tsconfig.json` }))
        }

        await Promise.all(fileTasks)
      }

      success(`Run the project using: cd ${projectName} && xs-dev run`)
    } else {
      warning(
        'Name is required to generate project: xs-dev init my-project-name',
      )
    }
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [
        {
          placeholder: 'projectName',
          parse: String,
          brief: 'Name of the generated project directory',
        },
      ],
    },
    flags: {
      typescript: {
        kind: 'boolean',
        brief:
          'Add TypeScript configuration to generated project; defaults to false',
        optional: true,
      },
      io: {
        kind: 'boolean',
        brief:
          'Add ECMA-419 standard API support to generated project; defaults to true',
        optional: true,
      },
      manifest: {
        kind: 'boolean',
        brief:
          'Use manifest.json file for project configuration instead of package.json; defaults to false',
        optional: true,
      },
      example: {
        kind: 'parsed',
        brief:
          'Name or path of an example project as the base for the generated project; omit a name or use --list-examples to select interactively',
        parse: String,
        optional: true,
      },
      'list-examples': {
        kind: 'boolean',
        brief: 'Select an example project from the Moddable SDK',
        optional: true,
      },
      overwrite: {
        kind: 'boolean',
        brief:
          'Replace any existing directories with the same name as the generated project; defaults to false',
        optional: true,
      },
      asyncMain: {
        kind: 'boolean',
        brief:
          'Add top-level await configuration to generated project; defaults to false',
        optional: true,
      },
    },
  },
})

export default command
