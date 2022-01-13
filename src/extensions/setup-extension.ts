import type { XSDevToolbox } from '../types'

export default async (toolbox: XSDevToolbox): Promise<void> => {
  const { filesystem, system, print, patching, semver } = toolbox
  const HOME_DIR = filesystem.homedir()
  const INSTALL_DIR = filesystem.resolve(HOME_DIR, '.local', 'share')
  const INSTALL_PATH =
    process.env.MODDABLE ?? filesystem.resolve(INSTALL_DIR, 'moddable')
  const PROFILE = await (async function () {
    const shell = process.env.SHELL ?? (await system.run(`echo $0`))
    if (shell.includes('zsh')) return '.zshrc'
    if (shell.includes('bash')) return '.bashrc'
    return '.profile'
  })()
  const PROFILE_PATH = filesystem.resolve(HOME_DIR, PROFILE)

  toolbox.setup = {
    darwin: async () => {
      print.info('Setting up the mac tools!')
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

      // 0. ensure xcode command line tools are available (?)
      try {
        await system.spawn('xcode-select -p')
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
          await system.spawn(`git clone ${MODDABLE_REPO} ${INSTALL_PATH}`)
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
        await system.spawn('make', { cwd: dir.cwd() })
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
    esp8266: async () => toolbox.print.info('Setting up esp8266 tools'),
    esp32: async () => {
      const ESP_IDF_REPO = 'https://github.com/espressif/esp-idf.git'
      const ESP_BRANCH = 'v4.3.1'
      const ESP32_DIR = filesystem.resolve(INSTALL_DIR, 'esp32')
      const IDF_PATH = filesystem.resolve(ESP32_DIR, 'esp-idf')
      print.info('Setting up esp32 tools')

      // 0. ensure Moddable exists
      if (process.env.MODDABLE === undefined) {
        print.warning(
          'Moddable tooling required. Run `xs-dev setup` before trying again.'
        )
        process.exit(1)
      }

      // 1. ensure ~/.local/share/esp32 directory
      print.info('Ensuring esp32 install directory')
      filesystem.dir(ESP32_DIR)

      // 2. clone esp-idf into ~/.local/share/esp32/esp-idf
      if (filesystem.exists(IDF_PATH) === false) {
        print.info('Cloning esp-idf repo')
        await system.spawn(
          `git clone -b ${ESP_BRANCH} --recursive ${ESP_IDF_REPO} ${IDF_PATH}`
        )
      }

      // 3. brew install python3, cmake, ninja, dfu-util
      print.info(
        'Installing build dependencies: python, cmake, ninja, dfu-util'
      )

      if (
        system.which('python') === null ||
        // get python verion, check if v3
        semver.satisfies(
          (await system.spawn('python --version', { trim: true })).stdout
            .toString()
            .split(' ')
            .pop(),
          '>= 3.x.x'
        )
      ) {
        await system.spawn('brew install python')
      }

      if (system.which('cmake') === null) {
        await system.spawn('brew install cmake')
      }

      if (system.which('ninja') === null) {
        await system.spawn('brew install ninja')
      }

      if (system.which('dfu-util') === null) {
        await system.spawn('brew install dfu-util')
      }

      // 4. install pip, if needed
      if (system.which('pip3') === null) {
        print.info('Installing pip3')
        await system.spawn('sudo easy_install pip3')
      }

      // 5. pip install pyserial, if needed
      print.info('Installing pyserial through pip3')
      await system.spawn('python3 -m install pyserial')

      // 6. append IDF_PATH env export to shell profile
      if (process.env.IDF_PATH === undefined) {
        print.info('Configuring $IDF_PATH')
        process.env.IDF_PATH = IDF_PATH
        await patching.patch(PROFILE_PATH, {
          insert: `export IDF_PATH=${IDF_PATH}`,
        })
      }

      // 7. cd to IDF_PATH, run install.sh
      print.info('Installing esp-idf tooling')
      await system.spawn('./install.sh', { cwd: IDF_PATH })

      // 8. append 'source $IDF_PATH/export.sh' to shell profile
      print.info('Sourcing esp-idf environment')
      await patching.patch(PROFILE_PATH, {
        insert: `source $IDF_PATH/export.sh`,
      })

      print.success(`
      Successfully set up esp32 platform support for Moddable!
      Test out the setup by plugging in your device and running: xs-dev test --device=esp32
      If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the "/dev.cu.*" that matches your device.
      `)
    },
    wasm: async () => {
      const EMSDK_REPO = 'https://github.com/emscripten-core/emsdk.git'
      const BINARYEN_REPO = 'https://github.com/WebAssembly/binaryen.git'
      const WASM_DIR = filesystem.resolve(INSTALL_DIR, 'wasm')
      const EMSDK_PATH = filesystem.resolve(WASM_DIR, 'emsdk')
      const BINARYEN_PATH = filesystem.resolve(WASM_DIR, 'binaryen')

      print.info('Setting up wasm simulator tools')

      // 0. ensure wasm instal directory and Moddable exists
      if (process.env.MODDABLE === undefined) {
        print.warning(
          'Moddable tooling required. Run `xs-dev setup` before trying again.'
        )
        process.exit(1)
      }
      print.info('Ensuring wasm directory')
      filesystem.dir(WASM_DIR)

      // 1. Clone EM_SDK repo, install, and activate latest version
      if (filesystem.exists(EMSDK_PATH) === false) {
        print.info('Cloning emsdk repo')
        try {
          await system.spawn(`git clone ${EMSDK_REPO} ${EMSDK_PATH}`)
          await system.spawn('./emsdk install latest', {
            cwd: EMSDK_PATH,
          })
          await system.spawn('./emsdk activate latest', {
            cwd: EMSDK_PATH,
          })
        } catch (error) {
          print.error(`Error activating emsdk: ${String(error)}`)
          process.exit(1)
        }
      }

      // 2. Clone Binaryen repo and build
      if (filesystem.exists(BINARYEN_PATH) === false) {
        print.info('Cloning binaryen repo')
        await system.spawn(`git clone ${BINARYEN_REPO} ${BINARYEN_PATH}`)

        if (system.which('cmake') === null) {
          print.info('Cmake required, installing with Homebrew')
          await system.spawn('brew install cmake')
        }

        await system.spawn('cmake . && make', {
          cwd: BINARYEN_PATH,
        })
      }

      // 3. Setup PATH and env variables for EM_SDK and Binaryen
      print.info('Sourcing emsdk environment and adding binaryen to PATH')
      await patching.patch(PROFILE_PATH, {
        insert: `source ${filesystem.resolve(EMSDK_PATH, 'emsdk_env.sh')}`,
      })
      await patching.patch(PROFILE_PATH, {
        insert: `export PATH=${filesystem.resolve(BINARYEN_PATH, 'bin')}:$PATH`,
      })
      process.env.PATH = `$PATH:${filesystem.resolve(BINARYEN_PATH, 'bin')}`

      // 4. Build Moddable WASM tools
      print.info('Building Moddable wasm tools')
      await system.spawn(`make`, {
        cwd: filesystem.resolve(
          String(process.env.MODDABLE),
          'build',
          'makefiles',
          'wasm'
        ),
      })

      print.success(
        `Successfully set up wasm platform support for Moddable! Test out the setup by plugging in your device and running: xs-dev test --device wasm`
      )
    },
  }
}
