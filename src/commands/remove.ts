import type { GluegunCommand } from 'gluegun'

interface RemoveOptions {
  device?: string
}

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
    const {
      device = ""
    }: RemoveOptions = parameters.options

    if (moduleName === undefined) {
      print.error('Module name is required')
      process.exit(1)
    }

    print.info(`Removing "${String(moduleName)}" from manifest includes`)
    await patching.update(manifestPath, (manifestIn) => {      
      let  manifest = manifestIn
      if (device !== "") {
        manifest.platforms ??= {}
        manifest.platforms[device] ??= {}
        manifest = manifest.platforms[device]
      }

      if (!("include" in manifest))
        return

      if (typeof manifest.include === "string")
        manifest.include = [manifest.include]

      const length = manifest.include.length
      manifest.include = manifest.include.filter(
        (mod: string) => {
          const result = !mod.includes(moduleName)
          if (!result)
            print.info(` Removing: ${mod}`)

          return result
        }
      )
      if (length === manifest.include.length)
        print.error(`"${moduleName}" not found. No modules removed.`)

      if (manifest.include.length === 1)
        manifest.include = manifest.include[0]
      else if (manifest.include.length === 0)
        delete manifest.include

      return manifestIn
    })
    print.success('Done!')
  },
}

export default command
