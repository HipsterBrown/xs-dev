import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../app.js'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices.js'
import type { Device } from '../types.js'
import * as output from '../lib/output.js'
import { readManifest, writeManifest, removeInclude } from '../toolbox/manifest/index.js'

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
      output.error(
        'Cannot find manifest.json. Must be in project directory to update manifest includes.',
      )
      process.exit(1)
    }

    if (moduleName === undefined) {
      output.error('Module name is required')
      return
    }

    output.info(`Removing "${String(moduleName)}" from manifest includes`)

    const { device = '' } = flags
    const manifest = await readManifest(manifestPath)
    const { manifest: updated, removed } = removeInclude(manifest, moduleName, device)

    if (removed.length === 0) {
      output.error(`"${moduleName}" not found. No modules removed.`)
      return
    }

    for (const mod of removed) {
      output.info(` Removing: ${mod}`)
    }

    await writeManifest(manifestPath, updated)

    output.success('Done!')
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
