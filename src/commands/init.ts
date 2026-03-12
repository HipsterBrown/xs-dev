import { buildCommand } from '@stricli/core'
import ora from 'ora'
import type { LocalContext } from '../app.js'
import { handleEvent } from '../lib/renderer.js'
import { createInteractivePrompter, createNonInteractivePrompter, isInteractive } from '../lib/prompter.js'
import initProject from '../toolbox/init/index.js'
import type { InitOptions } from '../toolbox/init/index.js'

const command = buildCommand({
  docs: {
    brief: 'Scaffold a new Moddable XS project',
  },
  async func(this: LocalContext, flags: InitOptions, projectName: string) {
    if (projectName === undefined) {
      // output.warn equivalent — use process.stdout since no spinner yet
      this.process.stdout.write(
        'Name is required to generate project: xs-dev init my-project-name\n',
      )
      return
    }

    const prompter = isInteractive()
      ? createInteractivePrompter()
      : createNonInteractivePrompter()

    const spinner = ora()
    for await (const event of initProject(projectName, flags, prompter)) {
      handleEvent(event, spinner)
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
        brief: 'Add TypeScript configuration to generated project; defaults to false',
        optional: true,
      },
      io: {
        kind: 'boolean',
        brief: 'Add ECMA-419 standard API support to generated project; defaults to true',
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
        brief: 'Add top-level await configuration to generated project; defaults to false',
        optional: true,
      },
    },
  },
})

export default command
