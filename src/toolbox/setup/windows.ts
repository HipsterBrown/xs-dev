import { 
  GluegunPrint,
  print,
  filesystem, 
  system 
} from 'gluegun'
import {
  INSTALL_PATH,
  INSTALL_DIR,
  MODDABLE_REPO,
  EXPORTS_FILE_PATH,
  TEMP_PATH
} from './constants'
import upsert from '../patching/upsert'
import ws from 'windows-shortcuts'
import { promisify } from 'util'
import { SetupArgs } from './types'

const wsPromise = promisify(ws.create)

const SHORTCUT = filesystem.resolve(INSTALL_DIR, "Moddable Command Prompt.lnk")

export async function setEnv(name: string, permanentValue: string, envValue?: string): Promise<void> {
  await upsert(EXPORTS_FILE_PATH, `set "${name}=${permanentValue}"`)
  process.env[name] = envValue !== undefined ? envValue : permanentValue
}

export function setTemporaryEnv(name: string, envValue: string): void {
  process.env[name] = envValue
}

export async function addToPath(path: string): Promise<void> {
  const newPath = `${path};${process.env.PATH ?? ""}`
  await setEnv("PATH", `${path};%PATH%`, newPath)
}

export function addToTemporaryPath(path: string): void {
  const newPath = `${path};${process.env.PATH ?? ""}`
  setTemporaryEnv("PATH", newPath)
}

export async function openModdableCommandPrompt(): Promise<void> {
  print.info('Opening the Moddable Command Prompt in a new Window')
  await system.run(`START "Moddable Command Prompt" "${SHORTCUT}"`)
}

export async function ensureModdableCommandPrompt(spinner: ReturnType<GluegunPrint['spin']>): Promise<void> {
  if (process.env.ISMODDABLECOMMANDPROMPT === undefined || process.env.ISMODDABLECOMMANDPROMPT === "") {
    if (filesystem.exists(SHORTCUT) !== false) {
      spinner.fail(`Moddable tooling required. Run xs-dev commands from the Moddable Command Prompt: ${SHORTCUT}`)
      await openModdableCommandPrompt()
    } else {
      spinner.fail('Moddable tooling required. Run `xs-dev setup` before trying again.')
    }
    process.exit(1)
  }
}

export default async function (_args: SetupArgs): Promise<void> {
  const BIN_PATH = filesystem.resolve(
    INSTALL_PATH,
    'build',
    'bin',
    'win',
    'release'
  )
  const BUILD_DIR = filesystem.resolve(
    INSTALL_PATH,
    'build',
    'makefiles',
    'win'
  )
  const TEMP_BUILD = filesystem.resolve(
    TEMP_PATH,
    'moddable',
    'build',
    'makefiles',
    'win'
  )
  const TEMP_BIN = filesystem.resolve(
    TEMP_PATH, 
    'moddable',
    'build',
    'bin',
    'win',
    'release'
  )

  print.info(`Setting up Windows tools at ${INSTALL_PATH}`)

  // 0. Check for Visual Studio CMD tools & Git
    if (system.which('nmake') === null || process.env.VSINSTALLDIR === undefined) {
      try {
        await system.exec('where winget')
      } catch (error) {
        print.error('Visual Studio 2022 Community is required to build the Moddable SDK')
        print.error('If you already have VS 2022 Community installed, please run "xs-dev setup" from the x86 Native Tools Command Prompt for VS 2022')
        print.error('You can download and install Visual Studio 2022 Community from https://www.visualstudio.com/downloads/')
        print.info('Or xs-dev can manage installing Visual Stuudio 2022 Community and other dependencies using the Windows Package Manager Client (winget).')
        print.info('You can install winget via the App Installer package in the Microsoft Store.')
        print.info('Please install either Visual Studio 2022 Community or winget, then launch a new x86 Native Tools Command Prompt for VS 2022 and re-run this setup.')
        process.exit(1)
      }

    print.info('Installing Visual Studio 2022 Community from winget...')
    try {
        await system.exec('winget install -e --id Microsoft.VisualStudio.2022.Community --silent', {stdio: 'inherit', shell: true})    
    } catch (error) {
        print.error('Visual Studio 2022 Community install failed')
        process.exit(1)
    }
    
    print.info('Visual Studio 2022 Community successfully installed.')
    print.info('The "Desktop development for C++" workload must be manually installed.')
    print.info('From your Start Menu, select Visual Studio Installer. Then "Modify." Then select "Desktop development with C++" Then "Modify" again.')
    print.info('When complete, please close this window and launch the "x86 Native Tools Command Prompt for VS 2022" from the start menu.')
    process.exit(1)
  }

  if (system.which('git') === null) {
    try {
      await system.exec('where winget')
    } catch (error) {
      print.error('git is required to clone the Moddable SDK')
      print.error('You can download and install git from https://git-scm.com/download/win')
      print.info('Or xs-dev can manage installing git and other dependencies using the Windows Package Manager Client (winget).')
      print.info('You can install winget via the App Installer package in the Microsoft Store.')
      print.info('Please install either git or winget, then launch a new xs86 Native Tools Command Prompt for VS 2022 and re-run this setup.')
      process.exit(1)
    }
    
    print.info('Installing git from winget...')
    try {
        await system.exec('winget install -e --id Git.Git --silent', {stdio: 'inherit', shell: true})    
    } catch (error) {
        print.error('git install failed')
        process.exit(1)
    }

    print.info('git successfully installed. Please close this window and re-launch the x86 Native Tools Command Prompt for VS 2022, then re-run this setup.')
    process.exit(1)
  }

  const spinner = print.spin()
  await upsert(EXPORTS_FILE_PATH, '@echo off')

  const vsBatPath = filesystem.resolve(process.env.VSINSTALLDIR, "VC", "Auxiliary", "Build", "vcvars32.bat")
  await upsert(EXPORTS_FILE_PATH, `call "${vsBatPath}"`)

  const MODDABLE_TEMP = filesystem.resolve(TEMP_PATH, "moddable")
  
  // 1. clone moddable repo into INSTALL_DIR directory if it does not exist yet

  if (filesystem.exists(TEMP_PATH) !== false)
    filesystem.remove(TEMP_PATH)

  try {
    filesystem.dir(INSTALL_DIR)
  } catch (error) {
    spinner.fail(`Error setting up install directory: ${String(error)}`)
    process.exit(1)
  }

  let buildInPlace = false

  if (filesystem.exists(INSTALL_PATH) !== false) {
    spinner.info('Moddable repo already installed')
    buildInPlace = true
  } else {
    try {
      spinner.start('Cloning Moddable-OpenSource/moddable repo')
      await system.spawn(`git clone ${MODDABLE_REPO} ${MODDABLE_TEMP}`)
      spinner.succeed()
    } catch (error) {
      spinner.fail(`Error cloning moddable repo: ${String(error)}`)
      process.exit(1)
    }
  }

  // 2. configure MODDABLE env variable, add release binaries dir to PATH
  spinner.start(`Creating Temporary Install Environment`)
  try {
    if (buildInPlace) {
      setTemporaryEnv('MODDABLE', INSTALL_PATH)
      addToTemporaryPath(BIN_PATH)
    } else {
      setTemporaryEnv('MODDABLE', MODDABLE_TEMP)
      addToTemporaryPath(TEMP_BIN)
    }
    spinner.succeed()
  } catch (error) {
    spinner.fail(error.toString())
  }

  // 3. build tools
  try {
    spinner.start(`Building Moddable SDK tools`)
    await system.exec(`build.bat`, { cwd: buildInPlace ? BUILD_DIR : TEMP_BUILD, stdout: process.stdout})
    spinner.succeed()
  } catch (error) {
    spinner.fail(`Error building Moddable SDK tools: ${String(error)}`)
    process.exit(1)
  }

  // 4. move everything into place
  spinner.start(`Finalizing Installation`)
  try {
    if (!buildInPlace) {
      filesystem.move(filesystem.resolve(TEMP_PATH, "moddable"), INSTALL_PATH)
      filesystem.remove(TEMP_PATH)
    }
    await setEnv('MODDABLE', INSTALL_PATH)
    await addToPath(BIN_PATH)
    await setEnv('ISMODDABLECOMMANDPROMPT', '1')
    spinner.succeed()
  } catch (error) {
    spinner.fail(error.toString())
  }

  // 5. create Windows shortcut
  try {
    spinner.start(`Creating Moddable Command Prompt Shortcut`)
    await wsPromise(SHORTCUT, {
      target: '^%comspec^%',
      args: `/k ${EXPORTS_FILE_PATH}`,
      workingDir: `${INSTALL_PATH}`,
      desc: "Moddable Command Prompt"
    })
    spinner.succeed()
  } catch (error) {
    spinner.fail('Error creating Moddable Command Prompt shortcut')
  }
  
  spinner.succeed("Moddable SDK successfully set up!")
  print.info(`A shortcut to the Moddable Command Prompt has been created at ${SHORTCUT}.`)
  print.info('You should always use the Moddable Command Prompt when working with the Moddable SDK.')
  print.info(`The Moddable Command Prompt will now open for you in a new Window. Please close this Command Prompt and use the Moddable Command Prompt instead.`)
  print.info(`As a next step, try running the "helloworld example" in the Moddable Command Prompt: xs-dev run --example helloworld'`)
  await openModdableCommandPrompt()
}
