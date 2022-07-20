import { 
  print,
  filesystem, 
  system 
} from 'gluegun'
import {
  INSTALL_PATH,
  INSTALL_DIR,
  MODDABLE_REPO,
  EXPORTS_FILE_PATH
} from './constants'
import upsert from '../patching/upsert'
import ws from 'windows-shortcuts'
import { promisify } from 'util'

const wsPromise = promisify(ws.create)

const SHORTCUT = filesystem.resolve(INSTALL_DIR, "Moddable Command Prompt.lnk")

export async function setEnv(name: string, permanentValue: string, envValue?: string): Promise<void> {
  await upsert(EXPORTS_FILE_PATH, `set "${name}=${permanentValue}"`)
  process.env[name] = envValue !== undefined ? envValue : permanentValue
}

export async function addToPath(path: string): Promise<void> {
  const newPath = path + ";" + process.env.PATH
  await setEnv("PATH", `${path};%PATH%`, newPath)
}

export default async function (): Promise<void> {
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

  print.info(`Setting up Windows tools at ${INSTALL_PATH}`)

  // 0. Check for Visual Studio CMD tools
    if (system.which('nmake') === null || process.env.VSINSTALLDIR == undefined) {
    print.error('Visual Studio 2022 Community is required to build the Moddable SDK: https://www.visualstudio.com/downloads/')
    print.error('If you already have VS 2022 Community installed, please run "xs-dev setup" from the x86 Native Tools Command Prompt for VS 2022')
    process.exit(1)
  }
  if (system.which('git') === null) {
    print.error(
      'git is required to clone the Moddable SDK: https://git-scm.com/download/win'
    )
    process.exit(1)
  }

  await upsert(EXPORTS_FILE_PATH, '@echo off')

  const vsBatPath = filesystem.resolve(process.env.VSINSTALLDIR, "VC", "Auxiliary", "Build", "vcvars32.bat")
  await upsert(EXPORTS_FILE_PATH, `call "${vsBatPath}"`)
  
  const spinner = print.spin()
  spinner.start('Beginning setup...')

  // 1. clone moddable repo into INSTALL_DIR directory if it does not exist yet
  try {
    filesystem.dir(INSTALL_DIR)
  } catch (error) {
    spinner.fail(`Error setting up install directory: ${String(error)}`)
    process.exit(1)
  }

  if (filesystem.exists(INSTALL_PATH) !== false) {
    spinner.info('Moddable repo already installed')
  } else {
    try {
      spinner.start('Cloning Moddable-OpenSource/moddable repo')
      await system.spawn(`git clone ${MODDABLE_REPO} ${INSTALL_PATH}`)
      spinner.succeed()
    } catch (error) {
      spinner.fail(`Error cloning moddable repo: ${String(error)}`)
      process.exit(1)
    }
  }

  // 2. configure MODDABLE env variable, add release binaries dir to PATH
  spinner.start(`Creating Moddable SDK Environment Batch File`)
  try {
    await setEnv('MODDABLE', INSTALL_PATH)
    await addToPath(BIN_PATH)
    await setEnv('ISMODDABLECOMMANDPROMPT', '1')
    spinner.succeed()
  } catch (error) {
    spinner.fail(error.toString())
  }

  // 3. build tools
  try {
    spinner.start(`Building Moddable SDK tools`)
    await system.exec(`build.bat`, { cwd: BUILD_DIR, stdout: process.stdout})
    spinner.succeed()
  } catch (error) {
    spinner.fail(`Error building Moddable SDK tools: ${String(error)}`)
    process.exit(1)
  }

  // 4. create Windows shortcut
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
  print.info('Please close this Command Prompt and then use the shortcut to open a new Moddable Command Prompt. You should always use the Moddable Command Prompt when working with the Moddable SDK.')
  print.info(`As a next step, try running the "helloworld example" in the Moddable Command Prompt: xs-dev run --example helloworld'`)
}
