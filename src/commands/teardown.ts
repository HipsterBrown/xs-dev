import { type as platformType } from 'os'
import type { GluegunCommand } from 'gluegun'
import {
  INSTALL_DIR,
  EXPORTS_FILE_PATH,
  getProfilePath,
} from '../toolbox/setup/constants'

const command: GluegunCommand = {
  name: 'teardown',
  description:
    'Remove all installed git repos and toolchains, unset environment changes',
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  run: async ({ print, filesystem, patching }) => {
    const PROFILE_PATH = getProfilePath()
    const spinner = print.spin()
    spinner.start('Tearing down Moddable tools and platform dependencies')

    filesystem.remove(EXPORTS_FILE_PATH)
    filesystem.remove(filesystem.resolve(INSTALL_DIR, 'moddable'))
    filesystem.remove(filesystem.resolve(INSTALL_DIR, 'wasm'))
    filesystem.remove(filesystem.resolve(INSTALL_DIR, 'esp32'))
    filesystem.remove(filesystem.resolve(INSTALL_DIR, 'esp'))
    filesystem.remove(filesystem.resolve(INSTALL_DIR, 'pico'))
    filesystem.remove(filesystem.resolve(INSTALL_DIR, 'fontbm'))
    filesystem.remove(filesystem.resolve(INSTALL_DIR, 'nrf52'))

    if (platformType() === 'Darwin') {
      const NC_PREFS_BACKUP = filesystem.resolve(INSTALL_DIR, 'ejectfix', 'com.apple.ncprefs.plist')
      if (filesystem.exists(NC_PREFS_BACKUP) === 'file') {
        filesystem.copy(NC_PREFS_BACKUP, filesystem.resolve(process.env.HOME ?? '~', 'Library', 'Preferences', 'com.apple.ncprefs.plist'), { overwrite: true })
      }
      filesystem.remove(filesystem.resolve(INSTALL_DIR, 'ejectfix'))
      filesystem.remove('/Applications/xsbug.app')
    }

    await patching.patch(PROFILE_PATH, {
      delete: `source ${EXPORTS_FILE_PATH}`,
    })

    spinner.succeed(`Clean up complete!`)
  },
}

export default command
