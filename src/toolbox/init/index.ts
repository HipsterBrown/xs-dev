import { existsSync, statSync, readdirSync, mkdirSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'
import { collectChoicesFromTree } from '../prompt/choices.js'
import { buildTree } from '../prompt/tree.js'
import { getHostContext } from '../toolchains/context.js'
import { getToolchain } from '../toolchains/registry.js'

export interface InitOptions {
  typescript?: boolean
  io?: boolean
  manifest?: boolean
  example?: string
  'list-examples'?: boolean
  overwrite?: boolean
  asyncMain?: boolean
}

export default async function* initProject(
  projectName: string,
  flags: InitOptions,
  prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  const {
    typescript = false,
    io = true,
    manifest = false,
    example,
    'list-examples': listExamples = false,
    overwrite = false,
    asyncMain = false,
  } = flags

  if (!overwrite && existsSync(projectName) && statSync(projectName).isDirectory()) {
    yield {
      type: 'warning',
      message: `Directory called ${projectName} already exists. Please pass the --overwrite flag to replace an existing project.`,
    }
    return
  }

  const ctx = getHostContext()
  const moddableToolchain = getToolchain('moddable')
  Object.assign(process.env, moddableToolchain?.getEnvVars(ctx))

  if (example !== undefined || listExamples) {
    yield { type: 'step:start', message: 'Discovering example projects...' }

    const exampleProjectPath = join(String(process.env.MODDABLE), 'examples')
    const exampleChildren =
      existsSync(exampleProjectPath) && statSync(exampleProjectPath).isDirectory()
        ? readdirSync(exampleProjectPath).map((entry) =>
          buildTree(join(exampleProjectPath, entry), entry),
        )
        : []
    const choices = exampleChildren.map((ex) => collectChoicesFromTree(ex)).flat()
    let selectedExample = choices.find((choice) => choice === example)

    if (listExamples || selectedExample === undefined) {
      const filteredChoices = choices.filter((choice) =>
        choice.includes(String(example)),
      )
      selectedExample = await prompter.select(
        'Here are the available example templates:',
        (filteredChoices.length > 0 ? filteredChoices : choices).map((c) => ({
          label: c,
          value: c,
        })),
      )
    }

    if (selectedExample === '' || selectedExample === undefined) {
      yield { type: 'warning', message: 'Please select an example template to use.' }
      return
    }

    const selectedExamplePath = join(exampleProjectPath, selectedExample)
    yield { type: 'info', message: `Generating project directory from ${selectedExample}` }
    cpSync(selectedExamplePath, projectName, { recursive: true, force: overwrite })
    yield { type: 'step:done' }
  } else {
    yield { type: 'step:start', message: `Generating Moddable project: ${projectName}` }

    mkdirSync(projectName, { recursive: true })

    const includes = [
      io
        ? [
          '"$(MODDABLE)/modules/io/manifest.json"',
          '"$(MODDABLE)/examples/manifest_net.json"',
        ]
        : '"$(MODDABLE)/examples/manifest_base.json"',
      typescript ? '"$(MODDABLE)/examples/manifest_typings.json"' : undefined,
    ]
      .filter(Boolean)
      .flat()
      .join(',\n\t')

    const defines: string = asyncMain ? ',\n  defines: {\n    async_main: 1\n  }' : ''

    const { createManifest, createMain, createPackageJSON, createTSConfig } =
      await import('./templates.js')

    const fileTasks = [
      createMain({
        target: `${projectName}/main.${typescript ? 'ts' : 'js'}`,
        legacy: manifest,
      }),
    ]

    if (manifest) {
      fileTasks.push(
        createManifest({
          target: `${projectName}/manifest.json`,
          includes,
          defines,
        }),
      )
    } else {
      fileTasks.push(
        createPackageJSON({
          target: `${projectName}/package.json`,
          projectName,
          typescript,
          io,
        }),
      )
    }

    if (typescript) {
      fileTasks.push(createTSConfig({ target: `${projectName}/tsconfig.json` }))
    }

    await Promise.all(fileTasks)
    yield { type: 'step:done' }
  }

  yield { type: 'info', message: `Run the project using: cd ${projectName} && xs-dev run` }
}
