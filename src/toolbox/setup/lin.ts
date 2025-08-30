import os from 'os'
import { promisify } from 'util'
import { chmod } from 'fs'
import { filesystem, print, system, prompt } from 'gluegun'
import {
  INSTALL_DIR,
  INSTALL_PATH,
  EXPORTS_FILE_PATH,
  XSBUG_LOG_PATH,
} from './constants'
import upsert from '../patching/upsert'
import { execWithSudo } from '../system/exec'
import { findMissingDependencies, installPackages } from '../system/packages'
import type { Dependency } from '../system/types'
import type { PlatformSetupArgs } from './types'
import { fetchRelease, downloadReleaseTools } from './moddable'
import { successVoid, isFailure, unwrap } from '../system/errors'
import type { SetupResult } from '../../types'

const chmodPromise = promisify(chmod)

export default async function({
  sourceRepo,
  branch,
  release,
  interactive,
}: PlatformSetupArgs): Promise<SetupResult> {
  print.info('Setting up Linux tools!')

  const BIN_PATH = filesystem.resolve(
    INSTALL_PATH,
    'build',
    'bin',
    'lin',
    'release',
  )
  const DEBUG_BIN_PATH = filesystem.resolve(
    INSTALL_PATH,
    'build',
    'bin',
    'lin',
    'debug',
  )
  const BUILD_DIR = filesystem.resolve(
    INSTALL_PATH,
    'build',
    'makefiles',
    'lin',
  )

  let buildTools = false
  const spinner = print.spin()
  spinner.start('Beginning setup...')

  filesystem.dir(INSTALL_DIR)

  // 0. check for the required build tools and libraries
  const dependencies: Dependency[] = [
    { name: 'bison', packageName: 'bison', type: 'binary' },
    { name: 'flex', packageName: 'flex', type: 'binary' },
    { name: 'gcc', packageName: 'gcc', type: 'binary' },
    { name: 'git', packageName: 'git', type: 'binary' },
    { name: 'gperf', packageName: 'gperf', type: 'binary' },
    { name: 'make', packageName: 'make', type: 'binary' },
    { name: 'wget', packageName: 'wget', type: 'binary' },
    { name: 'ncurses', packageName: 'libncurses-dev', type: 'library' },
    { name: 'gtk+-3.0', packageName: 'libgtk-3-dev', type: 'library' }
  ]

  spinner.start('Checking for missing dependencies...')
  const missingDependenciesResult = await findMissingDependencies(dependencies)
  if (isFailure(missingDependenciesResult)) return missingDependenciesResult

  // 1. Install or update the packages required to compile:
  spinner.start('Attempting to install dependencies...')
  if (missingDependenciesResult.data.length !== 0) {
    const result = await installPackages(missingDependenciesResult.data)
    if (isFailure(result)) return result
  }
  spinner.succeed()

  // 3. Download the Moddable repository, or use the git command line tool as follows:
  if (filesystem.exists(INSTALL_PATH) !== false) {
    spinner.info('Moddable repo already installed')
  } else {
    if (release !== undefined && (branch === undefined || branch === null)) {
      spinner.start('Getting latest Moddable-OpenSource/moddable release')
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

        const isArm = os.arch() === 'arm64'
        const assetName = isArm
          ? 'moddable-tools-lin64arm.zip'
          : 'moddable-tools-lin64.zip'
        spinner.info('Downloading release tools')
        await downloadReleaseTools({
          writePath: BIN_PATH,
          assetName,
          release: remoteRelease,
        })
        const tools = filesystem.list(BIN_PATH) ?? []
        await Promise.all(
          tools.map(async (tool) => {
            await chmodPromise(filesystem.resolve(BIN_PATH, tool), 0o751)
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
  }

  // 4. Setup the MODDABLE environment variable
  process.env.MODDABLE = INSTALL_PATH
  process.env.PATH = `${String(process.env.PATH)}:${BIN_PATH}`

  await upsert(EXPORTS_FILE_PATH, `# Generated by xs-dev CLI`)
  await upsert(EXPORTS_FILE_PATH, `export MODDABLE=${process.env.MODDABLE}`)
  await upsert(EXPORTS_FILE_PATH, `export PATH="${BIN_PATH}:$PATH"`)

  // 5. Build the Moddable command line tools, simulator, and debugger from the command line:
  if (buildTools) {
    spinner.start('Building platform tooling')
    await system.exec('make', { cwd: BUILD_DIR, stdout: process.stdout })
    spinner.succeed()
  }

  // 6. Install the desktop simulator and xsbug debugger applications
  spinner.start('Installing simulator')
  if (release !== undefined && (branch === undefined || branch === null)) {
    filesystem.dir(
      filesystem.resolve(
        BUILD_DIR,
        '..',
        '..',
        'tmp',
        'lin',
        'debug',
        'simulator',
      ),
    )
    await system.exec(
      `mcconfig -m -p x-lin ${filesystem.resolve(
        INSTALL_PATH,
        'tools',
        'xsbug',
        'manifest.json',
      )}`,
      { process },
    )
    await system.exec(
      `mcconfig -m -p x-lin ${filesystem.resolve(
        INSTALL_PATH,
        'tools',
        'mcsim',
        'manifest.json',
      )}`,
      { process },
    )
  }
  const installResult = await execWithSudo('make install', {
    cwd: BUILD_DIR,
    stdout: process.stdout,
  })
  if (isFailure(installResult)) return installResult
  spinner.succeed()

  if (system.which('npm') !== null) {
    spinner.start('Installing xsbug-log dependencies')
    await system.exec('npm install', { cwd: XSBUG_LOG_PATH })
    spinner.succeed()
  }

  // 7. Profit?
  print.success(
    'Moddable SDK successfully set up! Start a new terminal session and run the "helloworld example": xs-dev run --example helloworld',
  )

  return successVoid()
}
