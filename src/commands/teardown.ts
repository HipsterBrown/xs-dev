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
  run: async ({ print, filesystem, patching }) => {
    const PROFILE_PATH = getProfilePath()
    const spinner = print.spin()
    spinner.start('Tearing down Moddable tools and platform dependencies')

    filesystem.remove(EXPORTS_FILE_PATH)
    filesystem.remove(filesystem.resolve(INSTALL_DIR, 'moddable'))
    filesystem.remove(filesystem.resolve(INSTALL_DIR, 'wasm'))
    filesystem.remove(filesystem.resolve(INSTALL_DIR, 'esp32'))
    filesystem.remove(filesystem.resolve(INSTALL_DIR, 'esp'))

    await patching.patch(PROFILE_PATH, {
      delete: `source ${EXPORTS_FILE_PATH}`,
    })

    spinner.succeed(`Clean up complete!`)
  },
}

export default command
