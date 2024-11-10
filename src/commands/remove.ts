import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../cli'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'
import type { Device } from '../types'

interface RemoveOptions {
  device?: Device
}

const deviceSet = new Set(Object.values(DEVICE_ALIAS))

const command = buildCommand({
  docs: {
    brief: 'Name or select Moddable module to remove from project manifest',
  },
  async func(this: LocalContext, flags: RemoveOptions, moduleName: string) {
    const { filesystem, patching, print } = this
    const manifestPath = filesystem.resolve(process.cwd(), 'manifest.json')
    if (filesystem.exists(manifestPath) === false) {
      print.error(
        'Cannot find manifest.json. Must be in project directory to update manifest includes.',
      )
      process.exit(1)
    }
    const { device = '' } = flags

    if (moduleName === undefined) {
      print.error('Module name is required')
      process.exit(1)
    }

    print.info(`Removing "${String(moduleName)}" from manifest includes`)
    await patching.update(manifestPath, (manifestIn) => {
      let manifest = manifestIn
      if (device !== '') {
        manifest.platforms ??= {}
        manifest.platforms[device] ??= {}
        manifest = manifest.platforms[device]
      }

      if (!('include' in manifest)) {
        return
      }

      if (typeof manifest.include === 'string') {
        manifest.include = [manifest.include]
      }

      const length = manifest.include.length
      manifest.include = manifest.include.filter((mod: string) => {
        const result = !mod.includes(moduleName)
        if (!result) {
          print.info(` Removing: ${mod}`)
        }

        return result
      })
      if (length === manifest.include.length) {
        print.error(`"${moduleName}" not found. No modules removed.`)
      }

      if (manifest.include.length === 1) {
        manifest.include = manifest.include[0]
      } else if (manifest.include.length === 0) {
        delete manifest.include
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
            'Name of the SDK module dependency to remove from project manifest',
          parse: String,
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
