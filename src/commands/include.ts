import { readFile, writeFile } from 'node:fs/promises'
import { existsSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildCommand } from '@stricli/core'
import { select } from '@inquirer/prompts'
import type { LocalContext } from '../app'
import { collectChoicesFromTree } from '../toolbox/prompt/choices'
import { sourceEnvironment } from '../toolbox/system/exec'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'
import type { Device } from '../types'
import * as output from '../lib/output'

interface IncludeOptions {
  device?: Device
}

const deviceSet = new Set(Object.values(DEVICE_ALIAS))

interface TreeNode {
  name: string
  type: 'dir' | 'file'
  children: TreeNode[]
}

function buildTree(dirPath: string, name: string): TreeNode {
  const stat = statSync(dirPath)
  if (stat.isDirectory()) {
    const children = readdirSync(dirPath).map((entry) =>
      buildTree(join(dirPath, entry), entry),
    )
    return { name, type: 'dir', children }
  }
  return { name, type: 'file', children: [] }
}

const command = buildCommand({
  docs: {
    brief: 'Name or select Moddable module to add to project manifest',
  },
  async func(this: LocalContext, flags: IncludeOptions, moduleName?: string) {
    const manifestPath = join(process.cwd(), 'manifest.json')
    if (!existsSync(manifestPath)) {
      output.error(
        'Cannot find manifest.json. Must be in project directory to update manifest includes.',
      )
      process.exit(1)
    }

    await sourceEnvironment()

    const modulesPath = join(String(process.env.MODDABLE), 'modules')
    const { device = '' } = flags

    if (
      moduleName === undefined ||
      !existsSync(join(modulesPath, moduleName, 'manifest.json'))
    ) {
      // prompt with choices from $MODDABLE/modules
      const moduleChildren = existsSync(modulesPath) && statSync(modulesPath).isDirectory()
        ? readdirSync(modulesPath).map((entry) => buildTree(join(modulesPath, entry), entry))
        : undefined
      const choices =
        moduleChildren !== undefined
          ? moduleChildren.map((mod) => collectChoicesFromTree(mod)).flat()
          : []
      const filtered =
        moduleName !== undefined
          ? choices.filter((mod: string) => mod.includes(String(moduleName)))
          : choices
      const selectedModule = await select({
        message: 'Here are the available modules:',
        choices: (filtered.length > 0 ? filtered : choices).map((c) => ({ name: c, value: c })),
      })
      moduleName = selectedModule
    }

    output.info(`Adding "${String(moduleName)}" to manifest includes`)
    const modulePath = `$(MODDABLE)/modules/${String(moduleName)}/manifest.json`

    const raw = await readFile(manifestPath, 'utf8')
    const data = JSON.parse(raw) as Record<string, unknown>
    const fn = (manifestIn: Record<string, unknown>): Record<string, unknown> => {
      let manifest = manifestIn
      if (device !== '') {
        manifest.platforms ??= {}
        ;(manifest.platforms as Record<string, unknown>)[device] ??= {}
        manifest = (manifest.platforms as Record<string, unknown>)[device] as Record<string, unknown>
      }
      if (!('include' in manifest)) {
        manifest.include = []
      }
      if (typeof manifest.include === 'string') {
        manifest.include = [manifest.include]
      }
      if (!(manifest.include as string[]).includes(modulePath)) {
        (manifest.include as string[]).push(modulePath)
      }
      if ((manifest.include as string[]).length === 1) {
        manifest.include = (manifest.include as string[])[0]
      }
      return manifestIn
    }
    const result = fn(data)
    await writeFile(manifestPath, JSON.stringify(result ?? data, null, 2), 'utf8')

    output.success('Done!')
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
