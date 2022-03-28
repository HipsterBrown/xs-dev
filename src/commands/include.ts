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
      const filtered = moduleName ? choices.filter((mod: string) => mod.includes(String(moduleName))) : choices
      const { mod: selectedModule } = await prompt.ask([
        {
          type: 'autocomplete',
          name: 'mod',
          message: 'Here are the available modules:',
          choices: filtered.length ? filtered : choices,
        },
      ])
      moduleName = selectedModule
    }

    print.info(`Adding "${String(moduleName)}" to manifest includes`)
    const modulePath = `$(MODDABLE)/modules/${String(moduleName)}/manifest.json`
    await patching.update(manifestPath, (manifest) => {
      if (!manifest.include)
        manifest.include = []
      if ("string" === typeof manifest.include)
        manifest.include = [manifest.include]
      if (!manifest.include.includes(modulePath)) {
        manifest.include.push(
          modulePath
        )
      }
      if (1 === manifest.include.length)
        manifest.include = manifest.include[0]
      return manifest
    })
    print.success('Done!')
  },
}

export default command
