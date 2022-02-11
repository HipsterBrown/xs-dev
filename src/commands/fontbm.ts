import type { GluegunCommand } from 'gluegun'
import type { XSDevToolbox } from '../types'
import { EXPORTS_FILE_PATH, INSTALL_DIR } from '../toolbox/setup/constants'
import upsert from '../toolbox/patching/upsert'

const command: GluegunCommand<XSDevToolbox> = {
  name: 'fontbm',
  description: 'Download and install fontbm tool',
  run: async (toolbox) => {
    const { print, filesystem, system } = toolbox;
    const spinner = print.spin()

    const FONTBM_REPO = 'https://github.com/vladimirgamalyan/fontbm.git'
    const FONTBM_DIR = filesystem.resolve(INSTALL_DIR, 'fontbm')
  
    // 1. install cmake
    if (system.which('cmake') === null) {
      spinner.start('Cmake required, installing with Homebrew')
      await system.exec('brew install cmake')
      spinner.succeed()
    }
  
    // 2. install freetype
    if (filesystem.exists("/usr/local/Cellar/freetype") === false) {    //@@ is this the right way to check for FreeTYpe?
      spinner.start('FreeTYpe required, installing with Homebrew')
      await system.exec('brew install freetype')
      spinner.succeed()
    }

    // 3. clone fontbm
    if (filesystem.exists(FONTBM_DIR) === false) {
      spinner.start('Cloning fontbm repo')
      await system.spawn(
        `git clone ${FONTBM_REPO} ${FONTBM_DIR}`
      )
      spinner.succeed()
    }

    // 4. build fontbm
    spinner.start('Building fontbm')
    await system.exec('cmake .', {
      cwd: FONTBM_DIR,
      stdout: process.stdout,
    })
    await system.exec('make', {
      cwd: FONTBM_DIR,
      stdout: process.stdout,
    })
    spinner.succeed()
  
    // 5. set FONTBM environment variable
    if (!process.env.FONTBM) {
      process.env.FONTBM = `${FONTBM_DIR}/fontbm`;
      await upsert(EXPORTS_FILE_PATH, `export FONTBM=${process.env.FONTBM}`)
    }
  }
}

export default command
