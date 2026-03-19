import { readFile, writeFile } from 'node:fs/promises'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import ora from 'ora'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../app.js'
import { toolchains } from '../toolbox/toolchains/registry.js'
import { getHostContext } from '../toolbox/toolchains/context.js'
import { createNonInteractivePrompter } from '../lib/prompter.js'
import { handleEvent } from '../lib/renderer.js'
import { EXPORTS_FILE_PATH, INSTALL_DIR, getProfilePath } from '../toolbox/setup/constants.js'

const command = buildCommand({
  docs: {
    brief: 'Remove all installed git repos and toolchains, unset environment changes',
  },
  async func(this: LocalContext) {
    const spinner = ora()
    const ctx = getHostContext()
    const prompter = createNonInteractivePrompter()

    spinner.start('Tearing down platform dependencies')

    for (const toolchain of Object.values(toolchains)) {
      if (toolchain.platforms.includes(ctx.platform)) {
        for await (const event of toolchain.teardown(ctx, prompter)) {
          handleEvent(event, spinner)
        }
      }
    }

    // Non-adapter cleanup: fontbm, exports file, shell profile
    const remove = (path: string): void => {
      rmSync(path, { recursive: true, force: true })
    }
    remove(EXPORTS_FILE_PATH)
    remove(join(INSTALL_DIR, 'fontbm'))

    const profilePath = getProfilePath()
    if (existsSync(profilePath)) {
      const contents = await readFile(profilePath, 'utf8')
      const patched = contents
        .split('\n')
        .filter((line) => line.trim() !== `source ${EXPORTS_FILE_PATH}`)
        .join('\n')
      await writeFile(profilePath, patched, 'utf8')
    }

    spinner.succeed('Clean up complete!')
  },
  parameters: {
    flags: {},
  },
})

export default command
