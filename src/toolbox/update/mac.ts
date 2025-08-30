import os from 'os'
import { promisify } from 'util'
import { chmod } from 'fs'
import { print, system, filesystem, prompt } from 'gluegun'
import { INSTALL_PATH, MODDABLE_REPO, XSBUG_LOG_PATH } from '../setup/constants'
import {
  fetchRelease,
  moddableExists,
  downloadReleaseTools,
  MissingReleaseAssetError,
} from '../setup/moddable'
import type { SetupArgs } from '../setup/types'
import { sourceEnvironment } from '../system/exec'
import { isFailure, unwrap } from '../system/errors'

const chmodPromise = promisify(chmod)

export default async function ({
  branch,
  release,
  interactive,
}: SetupArgs): Promise<void> {
  print.info('Checking for SDK changes')

  await sourceEnvironment()

  // 0. ensure Moddable exists
  if (!moddableExists()) {
    print.error(
      'Moddable tooling required. Run `xs-dev setup` before trying again.',
    )
    process.exit(1)
  }

  let rebuildTools = false

  if (release !== undefined && (branch === undefined || branch === null)) {
    // get tag for current repo
    const currentTag: string = await system.exec('git tag', {
      cwd: process.env.MODDABLE,
    })
    // get release tag
    const remoteReleaseResult = await fetchRelease(release)
    if (isFailure(remoteReleaseResult)) {
      print.error(`Failed to fetch release: ${remoteReleaseResult.error}`)
      process.exit(1)
    }
    const remoteRelease = unwrap(remoteReleaseResult)

    if (currentTag.trim() === remoteRelease.tag_name) {
      print.success('Moddable SDK already up to date!')
      process.exit(0)
    }

    if (remoteRelease.assets.length === 0) {
      print.warning(
        `Moddable release ${release} does not have any pre-built assets.`,
      )
      rebuildTools =
        !interactive ||
        (await prompt.confirm(
          'Would you like to continue updating and build the SDK locally?',
          false,
        ))

      if (!rebuildTools) {
        print.info(
          'Please select another release version with pre-built assets: https://github.com/Moddable-OpenSource/moddable/releases',
        )
        process.exit(0)
      }
    }

    const spinner = print.spin()
    spinner.start('Updating Moddable SDK!')

    filesystem.remove(process.env.MODDABLE)
    await system.spawn(
      `git clone ${MODDABLE_REPO} ${INSTALL_PATH} --depth 1 --branch ${remoteRelease.tag_name} --single-branch`,
    )

    if (!rebuildTools) {
      const BIN_PATH = filesystem.resolve(
        INSTALL_PATH,
        'build',
        'bin',
        'mac',
        'release',
      )
      const DEBUG_BIN_PATH = filesystem.resolve(
        INSTALL_PATH,
        'build',
        'bin',
        'mac',
        'debug',
      )

      filesystem.dir(BIN_PATH)
      filesystem.dir(DEBUG_BIN_PATH)

      try {
        const universalAssetName = `moddable-tools-macuniversal.zip`
        await downloadReleaseTools({
          writePath: BIN_PATH,
          assetName: universalAssetName,
          release: remoteRelease,
        })
      } catch (error: unknown) {
        if (error instanceof MissingReleaseAssetError) {
          const isArm = os.arch() === 'arm64'
          const assetName = isArm
            ? 'moddable-tools-mac64arm.zip'
            : 'moddable-tools-mac64.zip'
          await downloadReleaseTools({
            writePath: BIN_PATH,
            assetName,
            release: remoteRelease,
          })
        } else {
          throw error as Error
        }
      }

      spinner.info('Updating tool permissions')
      const tools = filesystem.list(BIN_PATH) ?? []
      await Promise.all(
        tools.map(async (tool) => {
          if (tool.endsWith('.app')) {
            const mainPath = filesystem.resolve(
              BIN_PATH,
              tool,
              'Contents',
              'MacOS',
              'main',
            )
            await chmodPromise(mainPath, 0o751)
          } else {
            await chmodPromise(filesystem.resolve(BIN_PATH, tool), 0o751)
          }
          await filesystem.copyAsync(
            filesystem.resolve(BIN_PATH, tool),
            filesystem.resolve(DEBUG_BIN_PATH, tool),
          )
        }),
      )
      if (system.which('npm') !== null) {
        spinner.start('Installing xsbug-log dependencies')
        await system.exec('npm install', { cwd: XSBUG_LOG_PATH })
        spinner.succeed()
      }
      spinner.succeed(
        'Moddable SDK successfully updated! Start the xsbug.app and run the "helloworld example": xs-dev run --example helloworld',
      )
    }
  }

  if (typeof branch === 'string') {
    const currentRev: string = await system.exec(`git rev-parse ${branch}`, {
      cwd: process.env.MODDABLE,
    })
    const remoteRev: string = await system.exec(
      `git ls-remote origin refs/heads/${branch}`,
      { cwd: process.env.MODDABLE },
    )

    if (remoteRev.split('\t').shift() === currentRev.trim()) {
      print.success('Moddable SDK already up to date!')
      process.exit(0)
    }

    rebuildTools = true

    const spinner = print.spin()
    spinner.start('Updating Moddable SDK!')

    spinner.start('Stashing any unsaved changes before committing')
    await system.exec('git stash', { cwd: process.env.MODDABLE })
    await system.exec(`git pull origin ${branch}`, {
      cwd: process.env.MODDABLE,
    })
    spinner.succeed()
  }
  if (rebuildTools) {
    const spinner = print.spin()
    const BUILD_DIR = filesystem.resolve(
      process.env.MODDABLE ?? '',
      'build',
      'bin',
    )
    const TMP_DIR = filesystem.resolve(
      process.env.MODDABLE ?? '',
      'build',
      'tmp',
    )
    filesystem.remove(BUILD_DIR)
    filesystem.remove(TMP_DIR)

    spinner.start('Rebuilding platform tools')
    // install release assets or build
    await system.exec('make', {
      cwd: filesystem.resolve(
        String(process.env.MODDABLE),
        'build',
        'makefiles',
        'mac',
      ),
      stdout: process.stdout,
    })
    if (system.which('npm') !== null) {
      spinner.start('Installing xsbug-log dependencies')
      await system.exec('npm install', { cwd: XSBUG_LOG_PATH })
      spinner.succeed()
    }
    spinner.succeed(
      'Moddable SDK successfully updated! Start the xsbug.app and run the "helloworld example": xs-dev run --example helloworld',
    )
  }
}
