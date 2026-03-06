import { mkdir, readdir, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { execa } from 'execa'
import ws from 'windows-shortcuts'
import { promisify } from 'util'
import {
  INSTALL_PATH,
  INSTALL_DIR,
  EXPORTS_FILE_PATH,
  XSBUG_LOG_PATH,
} from './constants'
import upsert from '../patching/upsert'
import {
  downloadReleaseTools,
  fetchRelease,
} from './moddable'
import type { PlatformSetupArgs } from './types'
import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'
import { isFailure, unwrap } from '../system/errors'

const getWsPromise = (): ((path: string, options: unknown) => Promise<void>) => promisify(ws.create)

const SHORTCUT = resolve(INSTALL_DIR, 'Moddable Command Prompt.lnk')

function which(bin: string): string | null {
  try {
    const result = execSync(`where ${bin}`, { stdio: 'pipe' }).toString().trim()
    return result.length > 0 ? result : null
  } catch {
    return null
  }
}

async function setEnv(
  name: string,
  permanentValue: string,
  envValue?: string,
): Promise<void> {
  await upsert(EXPORTS_FILE_PATH, `set "${name}=${permanentValue}"`)
  process.env[name] = envValue ?? permanentValue
}

async function addToPath(path: string): Promise<void> {
  const newPath = `${path};${process.env.PATH ?? ''}`
  await setEnv('PATH', `${path};%PATH%`, newPath)
}

export default async function* setupWindows(
  {
    sourceRepo,
    branch,
    release,
  }: PlatformSetupArgs,
  prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  yield { type: 'step:start', message: 'Setting up Windows tools' }

  const BIN_PATH = resolve(
    INSTALL_PATH,
    'build',
    'bin',
    'win',
    'release',
  )
  const DEBUG_BIN_PATH = resolve(
    INSTALL_PATH,
    'build',
    'bin',
    'win',
    'debug',
  )
  const BUILD_DIR = resolve(
    INSTALL_PATH,
    'build',
    'makefiles',
    'win',
  )

  // 0. Check for Visual Studio CMD tools & Git
  if (
    which('nmake') === null ||
    process.env.VSINSTALLDIR === undefined
  ) {
    try {
      execSync('where winget', { stdio: 'pipe' })
    } catch (error) {
      yield { type: 'step:fail', message: 'Visual Studio 2022 Community is required to build the Moddable SDK. You can download and install it from https://www.visualstudio.com/downloads/' }
      return
    }

    yield { type: 'warning', message: 'Visual Studio 2022 Community is required to build the Moddable SDK but has not been detected' }
    const installVS = await prompter.confirm(
      'Would you like for xs-dev to install VS 2022 Community for you?',
      false,
    )

    if (!installVS) {
      yield { type: 'info', message: 'Please manually install VS 2022 Community from https://www.visualstudio.com/downloads/ and run xs-dev setup from the x86 Native Tools Command Prompt for VS 2022' }
      return
    }

    yield { type: 'step:start', message: 'Installing Visual Studio 2022 Community' }
    try {
      await execa('winget', [
        'install',
        '-e',
        '--id', 'Microsoft.VisualStudio.2022.Community',
        '--silent',
      ])
      yield { type: 'step:done' }
      yield { type: 'info', message: 'The "Desktop development for C++" workload must be manually installed. From Start Menu, select Visual Studio Installer, then Modify, then select Desktop development with C++' }
      return
    } catch (error) {
      yield { type: 'step:fail', message: `Visual Studio 2022 Community install failed: ${String(error)}` }
      return
    }
  }

  if (which('git') === null) {
    try {
      execSync('where winget', { stdio: 'pipe' })
    } catch (error) {
      yield { type: 'step:fail', message: 'git is required to clone the Moddable SDK. You can download and install it from https://git-scm.com/download/win' }
      return
    }

    yield { type: 'step:start', message: 'Installing git from winget' }
    try {
      await execa('winget', [
        'install',
        '-e',
        '--id', 'Git.Git',
        '--silent',
      ])
      yield { type: 'step:done' }
      yield { type: 'info', message: 'git successfully installed. Please close this window and re-launch the x86 Native Tools Command Prompt for VS 2022, then re-run this setup.' }
      return
    } catch (error) {
      yield { type: 'step:fail', message: `git install failed: ${String(error)}` }
      return
    }
  }

  try {
    await upsert(EXPORTS_FILE_PATH, '@echo off')

    const vsBatPath = resolve(
      process.env.VSINSTALLDIR ?? '',
      'VC',
      'Auxiliary',
      'Build',
      'vcvars32.bat',
    )
    await upsert(EXPORTS_FILE_PATH, `call "${vsBatPath}"`)
  } catch (error) {
    yield { type: 'step:fail', message: `Error setting up install directory: ${String(error)}` }
    return
  }

  let buildTools = false

  // 1. clone moddable repo into INSTALL_DIR directory if it does not exist yet
  if (existsSync(INSTALL_PATH)) {
    yield { type: 'info', message: 'Moddable repo already installed' }
  } else {
    try {
      if (release !== undefined && (branch === undefined || branch === null)) {
        yield { type: 'step:start', message: 'Getting latest Moddable-OpenSource/moddable release' }
        const remoteReleaseResult = await fetchRelease(release)
        if (isFailure(remoteReleaseResult)) {
          throw new Error(remoteReleaseResult.error)
        }
        const remoteRelease = unwrap(remoteReleaseResult)

        if (remoteRelease.assets.length === 0) {
          yield { type: 'step:done' }
          yield { type: 'warning', message: `Moddable release ${release} does not have any pre-built assets.` }
          buildTools = await prompter.confirm(
            'Would you like to continue setting up and build the SDK locally?',
            true,
          )

          if (!buildTools) {
            yield { type: 'info', message: 'Please select another release version with pre-built assets: https://github.com/Moddable-OpenSource/moddable/releases' }
            return
          }
          yield { type: 'step:start', message: 'Cloning repository' }
        }

        await execa('git', [
          'clone',
          sourceRepo,
          INSTALL_PATH,
          '--depth', '1',
          '--branch', remoteRelease.tag_name,
          '--single-branch',
        ])

        if (!buildTools) {
          await mkdir(BIN_PATH, { recursive: true })
          await mkdir(DEBUG_BIN_PATH, { recursive: true })

          yield { type: 'info', message: 'Downloading release tools' }

          const assetName = 'moddable-tools-win64.zip'
          await downloadReleaseTools({
            writePath: BIN_PATH,
            assetName,
            release: remoteRelease,
          })

          const tools = await readdir(BIN_PATH)
          await Promise.all(
            tools.map(async (tool) => {
              await copyFile(
                resolve(BIN_PATH, tool),
                resolve(DEBUG_BIN_PATH, tool),
              )
            }),
          )
        }
      } else if (branch !== undefined) {
        yield { type: 'step:start', message: `Cloning ${sourceRepo} repo` }
        await execa('git', [
          'clone',
          sourceRepo,
          INSTALL_PATH,
          '--depth', '1',
          '--branch', branch,
          '--single-branch',
        ])
        buildTools = true
      }
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error cloning moddable repo: ${String(error)}` }
      return
    }
  }

  // 2. configure MODDABLE env variable, add release binaries dir to PATH
  try {
    yield { type: 'step:start', message: 'Creating Moddable SDK Environment Batch File' }
    await setEnv('MODDABLE', INSTALL_PATH)
    await addToPath(BIN_PATH)
    await setEnv('ISMODDABLECOMMANDPROMPT', '1')
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error setting environment: ${String(error)}` }
    return
  }

  // 3. build tools if needed
  if (buildTools) {
    try {
      yield { type: 'step:start', message: 'Building Moddable SDK tools' }
      await execa('build.bat', { cwd: BUILD_DIR, shell: true })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error building Moddable SDK tools: ${String(error)}` }
      return
    }
  }

  // 4. create Windows shortcut
  try {
    yield { type: 'step:start', message: 'Creating Moddable Command Prompt Shortcut' }
    const wsPromise = getWsPromise()
    await wsPromise(SHORTCUT, {
      target: '^%comspec^%',
      args: `/k ${EXPORTS_FILE_PATH}`,
      workingDir: INSTALL_PATH,
      desc: 'Moddable Command Prompt',
    })
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'warning', message: `Error creating Moddable Command Prompt shortcut: ${String(error)}` }
  }

  if (which('npm') !== null) {
    try {
      yield { type: 'step:start', message: 'Installing xsbug-log dependencies' }
      await execa('npm', ['install'], { cwd: XSBUG_LOG_PATH })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'warning', message: `Error installing xsbug-log dependencies: ${String(error)}` }
    }
  }

  yield { type: 'step:done', message: 'Moddable SDK successfully set up! A shortcut to the Moddable Command Prompt has been created. Start a new terminal session and run the "helloworld example": xs-dev run --example helloworld' }
}
