import type { GluegunCommand } from 'gluegun'
import { collectChoicesFromTree } from '../toolbox/prompt/choices'

const command: GluegunCommand = {
  name: 'include',
  description: 'Name or select Moddable module to add to project manifest',
  run: async ({ prompt, filesystem, patching, print, parameters }) => {
    const manifestPath = filesystem.resolve(process.cwd(), 'manifest.json')
    if (filesystem.exists(manifestPath) === false) {
      print.error(
        'Cannot find manifest.json. Must be in project directory to update manifest includes.'
      )
      process.exit(1)
    }
    const modulesPath = filesystem.resolve(
      String(process.env.MODDABLE),
      'modules'
    )
    let moduleName = parameters.first

    if (
      moduleName === undefined ||
      filesystem.exists(
        filesystem.resolve(modulesPath, moduleName, 'manifest.json')
      ) === false
    ) {
      // prompt with choices from $MODDABLE/modules
      const modules = filesystem.inspectTree(modulesPath)?.children
      const choices =
        modules !== undefined
          ? modules.map((mod) => collectChoicesFromTree(mod)).flat()
          : []
      const { mod: selectedModule } = await prompt.ask([
        {
          type: 'autocomplete',
          name: 'mod',
          message: 'Here are the available modules:',
          choices,
        },
      ])
      moduleName = selectedModule
    }

    print.info(`Adding "${String(moduleName)}" to manifest includes`)
    await patching.update(manifestPath, (manifest) => {
      manifest.include.push(
        `$(MODDABLE)/modules/${String(moduleName)}/manifest.json`
      )
      return manifest
    })
    print.success('Done!')
  },
}

export default command
