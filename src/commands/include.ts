import { existsSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildCommand } from '@stricli/core'
import { select } from '@inquirer/prompts'
import type { LocalContext } from '../app.js'
import { collectChoicesFromTree } from '../toolbox/prompt/choices.js'
import { buildTree } from '../toolbox/prompt/tree.js'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices.js'
import type { Device } from '../types.js'
import * as output from '../lib/output.js'
import { readManifest, writeManifest, addInclude } from '../toolbox/manifest/index.js'
import { isInteractive } from '../lib/prompter.js'
import { getToolchain } from '../toolbox/toolchains/registry.js'
import { getHostContext } from '../toolbox/toolchains/context.js'

interface IncludeOptions {
  device?: Device
}

const deviceSet = new Set(Object.values(DEVICE_ALIAS))

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

    const ctx = getHostContext()
    const moddableToolchain = getToolchain('moddable')
    Object.assign(process.env, moddableToolchain?.getEnvVars(ctx))

    const modulesPath = join(String(process.env.MODDABLE), 'modules')
    const { device = '' } = flags

    if (
      isInteractive() && (
        moduleName === undefined ||
        !existsSync(join(modulesPath, moduleName, 'manifest.json'))
      )
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

    const manifest = await readManifest(manifestPath)
    const updated = addInclude(manifest, modulePath, device)
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
