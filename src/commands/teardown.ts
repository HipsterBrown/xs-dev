import { type as platformType } from 'node:os'
import { rmSync, cpSync, existsSync, statSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { buildCommand } from '@stricli/core'
import ora from 'ora'
import type { LocalContext } from '../app.js'
import {
  INSTALL_DIR,
  EXPORTS_FILE_PATH,
  getProfilePath,
} from '../toolbox/setup/constants.js'

const command = buildCommand({
  docs: {
    brief:
      'Remove all installed git repos and toolchains, unset environment changes',
  },
  async func(this: LocalContext) {
    const PROFILE_PATH = getProfilePath()
    const spinner = ora()
    spinner.start('Tearing down Moddable tools and platform dependencies')

    const remove = (path: string): void => { rmSync(path, { recursive: true, force: true }) }

    remove(EXPORTS_FILE_PATH)
    remove(join(INSTALL_DIR, 'moddable'))
    remove(join(INSTALL_DIR, 'wasm'))
    remove(join(INSTALL_DIR, 'esp32'))
    remove(join(INSTALL_DIR, 'esp'))
    remove(join(INSTALL_DIR, 'pico'))
    remove(join(INSTALL_DIR, 'fontbm'))
    remove(join(INSTALL_DIR, 'nrf52'))
    remove(join(INSTALL_DIR, 'zephyrproject'))

    if (platformType() === 'Darwin') {
      const NC_PREFS_BACKUP = join(INSTALL_DIR, 'ejectfix', 'com.apple.ncprefs.plist')
      if (existsSync(NC_PREFS_BACKUP) && statSync(NC_PREFS_BACKUP).isFile()) {
        cpSync(
          NC_PREFS_BACKUP,
          join(process.env.HOME ?? '~', 'Library', 'Preferences', 'com.apple.ncprefs.plist'),
        )
      }
      remove(join(INSTALL_DIR, 'ejectfix'))
      remove('/Applications/xsbug.app')
    }

    if (existsSync(PROFILE_PATH)) {
      const contents = await readFile(PROFILE_PATH, 'utf8')
      const patched = contents
        .split('\n')
        .filter((line) => line.trim() !== `source ${EXPORTS_FILE_PATH}`)
        .join('\n')
      await writeFile(PROFILE_PATH, patched, 'utf8')
    }

    spinner.succeed(`Clean up complete!`)
  },
  parameters: {
    flags: {},
  },
})

export default command
