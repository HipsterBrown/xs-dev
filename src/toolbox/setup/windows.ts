import { type GluegunPrint, print, filesystem, system, prompt } from 'gluegun'
import {
  INSTALL_PATH,
  INSTALL_DIR,
  EXPORTS_FILE_PATH,
  XSBUG_LOG_PATH,
} from './constants'
import upsert from '../patching/upsert'
import ws from 'windows-shortcuts'
import { promisify } from 'util'
import type { PlatformSetupArgs } from './types'
import { downloadReleaseTools, fetchRelease } from './moddable'
import type { Result, SetupResult } from '../../types'
import { failure, isFailure, successVoid, unwrap } from '../system/errors'

const wsPromise = promisify(ws.create)

const SHORTCUT = filesystem.resolve(INSTALL_DIR, 'Moddable Command Prompt.lnk')

export async function setEnv(
  name: string,
  permanentValue: string,
  envValue?: string,
): Promise<void> {
  await upsert(EXPORTS_FILE_PATH, `set "${name}=${permanentValue}"`)
  process.env[name] = envValue ?? permanentValue
}

export async function addToPath(path: string): Promise<void> {
  const newPath = `${path};${process.env.PATH ?? ''}`
  await setEnv('PATH', `${path};%PATH%`, newPath)
}

export async function openModdableCommandPrompt(): Promise<void> {
  print.info('Opening the Moddable Command Prompt in a new Window')
  await system.run(`START "Moddable Command Prompt" "${SHORTCUT}"`)
}

export async function ensureModdableCommandPrompt(
  spinner: ReturnType<GluegunPrint['spin']>,
): Promise<Result<void>> {
  if (
    process.env.ISMODDABLECOMMANDPROMPT === undefined ||
    process.env.ISMODDABLECOMMANDPROMPT === ''
  ) {
    if (filesystem.exists(SHORTCUT) !== false) {
      spinner.fail(
        `Moddable tooling required. Run xs-dev commands from the Moddable Command Prompt: ${SHORTCUT}`,
      )
      await openModdableCommandPrompt()
    } else {
      spinner.fail(
        'Moddable tooling required. Run `xs-dev setup` before trying again.',
      )
    }
    return failure('Moddable tooling required.')
  }
  return successVoid()
}

export default async function({
  sourceRepo,
  branch,
  release,
  interactive,
}: PlatformSetupArgs): Promise<SetupResult> {
  const BIN_PATH = filesystem.resolve(
    INSTALL_PATH,
    'build',
    'bin',
    'win',
    'release',
  )
  const DEBUG_BIN_PATH = filesystem.resolve(
    INSTALL_PATH,
    'build',
    'bin',
    'win',
    'debug',
  )
  const BUILD_DIR = filesystem.resolve(
    INSTALL_PATH,
    'build',
    'makefiles',
    'win',
  )

  print.info(`Setting up Windows tools at ${INSTALL_PATH}`)

  // 0. Check for Visual Studio CMD tools & Git
  if (
    system.which('nmake') === null ||
    process.env.VSINSTALLDIR === undefined
  ) {
    try {
      await system.exec('where winget')
    } catch (error) {
      print.error(
        'Visual Studio 2022 Community is required to build the Moddable SDK',
      )
      print.error(
        'If you already have VS 2022 Community installed, please run "xs-dev setup" from the x86 Native Tools Command Prompt for VS 2022',
      )
      print.error(
        'You can download and install Visual Studio 2022 Community from https://www.visualstudio.com/downloads/',
      )
      print.info(
        'Or xs-dev can manage installing Visual Studio 2022 Community and other dependencies using the Windows Package Manager Client (winget).',
      )
      print.info(
        'You can install winget via the App Installer package in the Microsoft Store.',
      )
      print.info(
        'Please install either Visual Studio 2022 Community or winget, then launch a new xs86 Native Tools Command Prompt for VS 2022 and re-run this setup.',
      )
      return failure('Visual Studio 2022 Community is required to build the Moddable SDK')
    }

    print.error(
      'Visual Studio 2022 Community is required to build the Moddable SDK but has not been detected',
    )
    print.error(
      'If you already have VS 2022 Community installed, please run "xs-dev setup" from the x86 Native Tools Command Prompt for VS 2022',
    )
    print.info(
      'If you do not have VS 2022 Community installed, xs-dev can install it for you using the Windows Package Manager Client (winget).',
    )
    const response = await prompt.confirm(
      'Would you like for xs-dev to install VS 2022 Community for you?',
    )

    if (!response) {
      print.info(
        'Okay. Please manually install VS 2022 Community from https://www.visualstudio.com/downloads/ if necessary and then run "xs-dev setup" from the x86 Native Tools Command Prompt for VS 2022',
      )
      return failure('Please manually install VS 2022 Community')
    }

    print.info('Okay. Installing Visual Studio 2022 Community from winget...')
    try {
      await system.exec(
        'winget install -e --id Microsoft.VisualStudio.2022.Community --silent',
        { stdio: 'inherit', shell: true },
      )
    } catch (error) {
      print.error('Visual Studio 2022 Community install failed')
      return failure('Visual Studio 2022 Community install failed')
    }

    print.info('Visual Studio 2022 Community successfully installed.')
    print.info(
      'The "Desktop development for C++" workload must be manually installed.',
    )
    print.info(
      'From your Start Menu, select Visual Studio Installer. Then "Modify." Then select "Desktop development with C++" Then "Modify" again.',
    )
    print.info(
      'When complete, please close this window and launch the "x86 Native Tools Command Prompt for VS 2022" from the start menu.',
    )
    return successVoid()
  }

  if (system.which('git') === null) {
    try {
      await system.exec('where winget')
    } catch (error) {
      print.error('git is required to clone the Moddable SDK')
      print.error(
        'You can download and install git from https://git-scm.com/download/win',
      )
      print.info(
        'Or xs-dev can manage installing git and other dependencies using the Windows Package Manager Client (winget).',
      )
      print.info(
        'You can install winget via the App Installer package in the Microsoft Store.',
      )
      print.info(
        'Please install either git or winget, then launch a new xs86 Native Tools Command Prompt for VS 2022 and re-run this setup.',
      )
      return failure('git is required to clone the Moddable SDK')
    }

    print.info('Installing git from winget...')
    try {
      await system.exec('winget install -e --id Git.Git --silent', {
        stdio: 'inherit',
        shell: true,
      })
    } catch (error) {
      print.error('git install failed')
      return failure('git install failed')
    }

    print.info(
      'git successfully installed. Please close this window and re-launch the x86 Native Tools Command Prompt for VS 2022, then re-run this setup.',
    )
    return successVoid()
  }

  const spinner = print.spin()
  await upsert(EXPORTS_FILE_PATH, '@echo off')

  const vsBatPath = filesystem.resolve(
    process.env.VSINSTALLDIR,
    'VC',
    'Auxiliary',
    'Build',
    'vcvars32.bat',
  )
  await upsert(EXPORTS_FILE_PATH, `call "${vsBatPath}"`)

  // 1. clone moddable repo into INSTALL_DIR directory if it does not exist yet
  try {
    filesystem.dir(INSTALL_DIR)
  } catch (error) {
    spinner.fail(`Error setting up install directory: ${String(error)}`)
    return failure(`Error setting up install directory: ${String(error)}`)
  }
  let buildTools = false

  if (filesystem.exists(INSTALL_PATH) !== false) {
    spinner.info('Moddable repo already installed')
  } else {
    try {
      if (release !== undefined && (branch === undefined || branch === null)) {
        spinner.start(`Getting latest Moddable-OpenSource/moddable release`)
        const remoteReleaseResult = await fetchRelease(release)
        if (isFailure(remoteReleaseResult)) {
          throw new Error(remoteReleaseResult.error)
        }
        const remoteRelease = unwrap(remoteReleaseResult)

        if (remoteRelease.assets.length === 0) {
          spinner.stop()
          print.warning(
            `Moddable release ${release} does not have any pre-built assets.`,
          )
          buildTools =
            !interactive ||
            (await prompt.confirm(
              'Would you like to continue setting up and build the SDK locally?',
              true,
            ))

          if (!buildTools) {
            print.info(
              'Please select another release version with pre-built assets: https://github.com/Moddable-OpenSource/moddable/releases',
            )
            return successVoid()
          }
          spinner.start()
        }

        await system.spawn(
          `git clone ${sourceRepo} ${INSTALL_PATH} --depth 1 --branch ${remoteRelease.tag_name} --single-branch`,
        )

        if (!buildTools) {
          filesystem.dir(BIN_PATH)
          filesystem.dir(DEBUG_BIN_PATH)

          spinner.info('Downloading release tools')

          const assetName = `moddable-tools-win64.zip`
          await downloadReleaseTools({
            writePath: BIN_PATH,
            assetName,
            release: remoteRelease,
          })

          const tools = filesystem.list(BIN_PATH) ?? []
          await Promise.all(
            tools.map(async (tool) => {
              await filesystem.copyAsync(
                filesystem.resolve(BIN_PATH, tool),
                filesystem.resolve(DEBUG_BIN_PATH, tool),
              )
            }),
          )
        }
      } else {
        spinner.start(`Cloning ${sourceRepo} repo`)
        await system.spawn(
          `git clone ${sourceRepo} ${INSTALL_PATH} --depth 1 --branch ${branch} --single-branch`,
        )
        buildTools = true
      }
      spinner.succeed()
    } catch (error) {
      spinner.fail(`Error cloning moddable repo: ${String(error)}`)
      return failure(`Error cloning moddable repo: ${String(error)}`)
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
    spinner.fail(error.toString() as string)
  }

  // 3. build tools if needed
  if (buildTools) {
    try {
      spinner.start(`Building Moddable SDK tools`)
      await system.exec(`build.bat`, { cwd: BUILD_DIR, stdout: process.stdout })
      spinner.succeed()
    } catch (error) {
      spinner.fail(`Error building Moddable SDK tools: ${String(error)}`)
      return failure(`Error building Moddable SDK tools: ${String(error)}`)
    }
  }

  // 4. create Windows shortcut
  try {
    spinner.start(`Creating Moddable Command Prompt Shortcut`)
    await wsPromise(SHORTCUT, {
      target: '^%comspec^%',
      args: `/k ${EXPORTS_FILE_PATH}`,
      workingDir: `${INSTALL_PATH}`,
      desc: 'Moddable Command Prompt',
    })
    spinner.succeed()
  } catch (error) {
    spinner.fail('Error creating Moddable Command Prompt shortcut')
  }

  if (system.which('npm') !== null) {
    spinner.start('Installing xsbug-log dependencies')
    await system.exec('npm install', { cwd: XSBUG_LOG_PATH })
    spinner.succeed()
  }

  spinner.succeed('Moddable SDK successfully set up!')
  print.info(
    `A shortcut to the Moddable Command Prompt has been created at ${SHORTCUT}.`,
  )
  print.info(
    'You should always use the Moddable Command Prompt when working with the Moddable SDK.',
  )
  print.info(
    `The Moddable Command Prompt will now open for you in a new Window. Please close this Command Prompt and use the Moddable Command Prompt instead.`,
  )
  print.info(
    `As a next step, try running the "helloworld example" in the Moddable Command Prompt: xs-dev run --example helloworld'`,
  )
  await openModdableCommandPrompt()
  return successVoid()
}
