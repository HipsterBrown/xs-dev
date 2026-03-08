import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../app'
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
    const manifestPath = join(process.cwd(), 'manifest.json')
    if (!existsSync(manifestPath)) {
      console.error(
        'Cannot find manifest.json. Must be in project directory to update manifest includes.',
      )
      process.exit(1)
    }
    const { device = '' } = flags

    if (moduleName === undefined) {
      console.error('Module name is required')
      return
    }

    console.log(`Removing "${String(moduleName)}" from manifest includes`)

    const raw = await readFile(manifestPath, 'utf8')
    const data = JSON.parse(raw) as Record<string, unknown>
    const fn = (manifestIn: Record<string, unknown>): Record<string, unknown> | undefined => {
      let manifest = manifestIn
      if (device !== '') {
        manifest.platforms ??= {}
        ;(manifest.platforms as Record<string, unknown>)[device] ??= {}
        manifest = (manifest.platforms as Record<string, unknown>)[device] as Record<string, unknown>
      }

      if (!('include' in manifest)) {
        return
      }

      if (typeof manifest.include === 'string') {
        manifest.include = [manifest.include]
      }

      const lengthBefore = (manifest.include as string[]).length
      manifest.include = (manifest.include as string[]).filter((mod: string) => {
        const result = !mod.includes(moduleName)
        if (!result) {
          console.log(` Removing: ${mod}`)
        }

        return result
      })
      if ((manifest.include as string[]).length === lengthBefore) {
        console.error(`"${moduleName}" not found. No modules removed.`)
      }

      if ((manifest.include as string[]).length === 1) {
        manifest.include = (manifest.include as string[])[0]
      } else if ((manifest.include as string[]).length === 0) {
        delete manifest.include
      }

      return manifestIn
    }
    const result = fn(data)
    await writeFile(manifestPath, JSON.stringify(result ?? data, null, 2), 'utf8')

    console.log('Done!')
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
