import type { XSDevToolbox } from '../types'

export default (toolbox: XSDevToolbox): void => {
  toolbox.setup = {
    darwin: async () => {
      const { filesystem, system, print, patching } = toolbox
      print.info('Setting up the mac tools!')

      const HOME_DIR = filesystem.homedir()
      const INSTALL_DIR = filesystem.resolve(HOME_DIR, '.local', 'share')
      const INSTALL_PATH =
        process.env.MODDABLE ?? filesystem.resolve(INSTALL_DIR, 'moddable')
      const MODDABLE_REPO = 'https://github.com/Moddable-OpenSource/moddable'
      const BIN_PATH = filesystem.resolve(
        INSTALL_PATH,
        'build',
        'bin',
        'mac',
        'release'
      )
      const BUILD_DIR = filesystem.resolve(
        INSTALL_PATH,
        'build',
        'makefiles',
        'mac'
      )
      const PROFILE = await (async function () {
        const shell = process.env.SHELL ?? (await system.run(`echo $0`))
        if (shell.includes('zsh')) return '.zshrc'
        if (shell.includes('bash')) return '.bashrc'
        return '.profile'
      })()
      const PROFILE_PATH = filesystem.resolve(HOME_DIR, PROFILE)

      // 0. ensure xcode command line tools are available (?)
      try {
        await system.run('xcode-select -p')
      } catch (error) {
        print.error(
          'Xcode command line tools are required to build the SDK: https://developer.apple.com/xcode/'
        )
        process.exit(1)
      }

      // 1. clone moddable repo into ./local/share directory if it does not exist yet
      try {
        filesystem.dir(INSTALL_DIR)
      } catch (error) {
        print.error(`Error setting up install directory: ${String(error)}`)
        process.exit(1)
      }

      if (filesystem.exists(INSTALL_PATH) !== false) {
        print.info('Moddable repo already installed')
      } else {
        try {
          await system.run(`git clone ${MODDABLE_REPO} ${INSTALL_PATH}`)
        } catch (error) {
          print.error(`Error cloning moddable repo: ${String(error)}`)
          process.exit(1)
        }
      }

      // 2. configure MODDABLE env variable, add release binaries dir to PATH
      if (process.env.MODDABLE === undefined) {
        process.env.MODDABLE = INSTALL_PATH
        process.env.PATH = `${String(process.env.PATH)}:${BIN_PATH}`

        await patching.patch(PROFILE_PATH, {
          insert: `export MODDABLE=${process.env.MODDABLE}`,
        })
        await patching.patch(PROFILE_PATH, {
          insert: `export PATH="${BIN_PATH}:$PATH"`,
        })
      } else {
        print.info(`Using current MODDABLE env: ${process.env.MODDABLE}`)
      }

      // 3. cd into makefiles dir for platform, run `make`
      try {
        const dir = filesystem.cwd(filesystem.resolve(BUILD_DIR))
        await system.run('make', { cwd: dir.cwd() })
      } catch (error) {
        print.error(`Error building mac tooling: ${String(error)}`)
        process.exit(1)
      }

      // 4. symlink xsbug.app into user applications directory
      try {
        filesystem.symlink(
          filesystem.resolve(BIN_PATH, 'xsbug.app'),
          '/Applications/xsbug.app'
        )
      } catch (error) {
        if (!String(error).includes('exists')) {
          print.error(`Issue creating symlink for xsbug.app: ${String(error)}`)
          process.exit(1)
        } else {
          print.info('xsbug.app symlink already exists')
        }
      }

      print.success(
        'Moddable SDK successfully set up! Start the xsbug.app and run the "helloworld example": xs-dev test'
      )
    },
    linux: async () =>
      toolbox.print.info('Linux setup is not currently supported'),
    windows_nt: async () =>
      toolbox.print.warning('Windows setup is not currently supported'),
    esp: async () => toolbox.print.info('Setting up esp8266 tools'),
    esp8266: async () => toolbox.info('Setting up esp8266 tools'),
    esp32: async () => toolbox.info('Setting up esp32 tools'),
    wasm: async () => toolbox.info('Setting up wasm tools'),
  }
}
