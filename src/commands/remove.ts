import type { GluegunCommand } from 'gluegun'

const command: GluegunCommand = {
  name: 'remove',
  description: 'Name or select Moddable module to remove from project manifest',
  run: async ({ filesystem, patching, print, parameters }) => {
    const manifestPath = filesystem.resolve(process.cwd(), 'manifest.json')
    if (filesystem.exists(manifestPath) === false) {
      print.error(
        'Cannot find manifest.json. Must be in project directory to update manifest includes.'
      )
      process.exit(1)
    }
    const moduleName = parameters.first

    if (moduleName === undefined) {
      print.error('Module name is required')
      process.exit(1)
    }

    print.info(`Removing "${String(moduleName)}" to manifest includes`)
    await patching.update(manifestPath, (manifest) => {
      manifest.include = manifest.include.filter(
        (mod: string) => !mod.includes(moduleName)
      )
      return manifest
    })
    print.success('Done!')
  },
}

export default command
