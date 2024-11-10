import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../cli'
import { collectChoicesFromTree } from '../toolbox/prompt/choices'
import { sourceEnvironment } from '../toolbox/system/exec'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'
import type { Device } from '../types'

interface IncludeOptions {
  device?: Device
}

const deviceSet = new Set(Object.values(DEVICE_ALIAS))

const command = buildCommand({
  docs: {
    brief: 'Name or select Moddable module to add to project manifest',
  },
  async func(this: LocalContext, flags: IncludeOptions, moduleName?: string) {
    const { filesystem, patching, print, prompt } = this
    const manifestPath = filesystem.resolve(process.cwd(), 'manifest.json')
    if (filesystem.exists(manifestPath) === false) {
      print.error(
        'Cannot find manifest.json. Must be in project directory to update manifest includes.',
      )
      process.exit(1)
    }

    await sourceEnvironment()

    const modulesPath = filesystem.resolve(
      String(process.env.MODDABLE),
      'modules',
    )
    const { device = '' } = flags

    if (
      moduleName === undefined ||
      filesystem.exists(
        filesystem.resolve(modulesPath, moduleName, 'manifest.json'),
      ) === false
    ) {
      // prompt with choices from $MODDABLE/modules
      const modules = filesystem.inspectTree(modulesPath)?.children
      const choices =
        modules !== undefined
          ? modules.map((mod) => collectChoicesFromTree(mod)).flat()
          : []
      const filtered =
        moduleName !== undefined
          ? choices.filter((mod: string) => mod.includes(String(moduleName)))
          : choices
      const { mod: selectedModule } = await prompt.ask([
        {
          type: 'autocomplete',
          name: 'mod',
          message: 'Here are the available modules:',
          choices: filtered.length > 0 ? filtered : choices,
        },
      ])
      moduleName = selectedModule
    }

    print.info(`Adding "${String(moduleName)}" to manifest includes`)
    const modulePath = `$(MODDABLE)/modules/${String(moduleName)}/manifest.json`
    await patching.update(manifestPath, (manifestIn) => {
      let manifest = manifestIn
      if (device !== '') {
        manifest.platforms ??= {}
        manifest.platforms[device] ??= {}
        manifest = manifest.platforms[device]
      }
      if (!('include' in manifest)) {
        manifest.include = []
      }
      if (typeof manifest.include === 'string') {
        manifest.include = [manifest.include]
      }
      if (manifest.include.includes(modulePath) === false) {
        manifest.include.push(modulePath)
      }
      if (manifest.include.length === 1) {
        manifest.include = manifest.include[0]
      }
      return manifestIn
    })
    print.success('Done!')
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [
        {
          placeholder: 'moduleName',
          brief:
            'Name of the SDK module to include in the project manifest; omit to select interactively',
          parse: String,
          optional: true,
        },
      ],
    },
    flags: {
      device: {
        kind: 'enum',
        values: [...deviceSet] as NonNullable<Device[]>,
        brief: 'Target device or platform for the dependency',
        optional: true,
      },
    },
    aliases: {
      d: 'device',
    },
  },
})

export default command
