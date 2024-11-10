import os from 'os'
import { promisify } from 'util'
import { chmod } from 'fs'
import { print, system, filesystem } from 'gluegun'
import { INSTALL_PATH, MODDABLE_REPO, XSBUG_LOG_PATH } from '../setup/constants'
import {
  fetchLatestRelease,
  moddableExists,
  downloadReleaseTools,
  MissingReleaseAssetError,
} from '../setup/moddable'
import type { SetupArgs } from '../setup/types'
import { sourceEnvironment } from '../system/exec'

const chmodPromise = promisify(chmod)

export default async function ({ targetBranch }: SetupArgs): Promise<void> {
  print.info('Checking for SDK changes')

  await sourceEnvironment()

  // 0. ensure Moddable exists
  if (!moddableExists()) {
    print.error(
      'Moddable tooling required. Run `xs-dev setup` before trying again.',
    )
    process.exit(1)
  }

  if (targetBranch === 'latest-release') {
    // get tag for current repo
    const currentTag: string = await system.exec('git tag', {
      cwd: process.env.MODDABLE,
    })
    // get latest release tag
    const latestRelease = await fetchLatestRelease()

    if (currentTag.trim() === latestRelease.tag_name) {
      print.success('Moddable SDK already up to date!')
      process.exit(0)
    }

    const spinner = print.spin()
    spinner.start('Updating Moddable SDK!')

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

    filesystem.remove(process.env.MODDABLE)
    await system.spawn(
      `git clone ${MODDABLE_REPO} ${INSTALL_PATH} --depth 1 --branch ${latestRelease.tag_name} --single-branch`,
    )

    filesystem.dir(BIN_PATH)
    filesystem.dir(DEBUG_BIN_PATH)

    try {
      const universalAssetName = `moddable-tools-macuniversal.zip`
      await downloadReleaseTools({
        writePath: BIN_PATH,
        assetName: universalAssetName,
        release: latestRelease,
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
          release: latestRelease,
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

  if (targetBranch === 'public') {
    const currentRev: string = await system.exec('git rev-parse public', {
      cwd: process.env.MODDABLE,
    })
    const remoteRev: string = await system.exec(
      'git ls-remote origin refs/heads/public',
      { cwd: process.env.MODDABLE },
    )

    if (remoteRev.split('\t').shift() === currentRev.trim()) {
      print.success('Moddable SDK already up to date!')
      process.exit(0)
    }

    const spinner = print.spin()
    spinner.start('Updating Moddable SDK!')

    spinner.start('Stashing any unsaved changes before committing')
    await system.exec('git stash', { cwd: process.env.MODDABLE })
    await system.exec('git pull origin public', { cwd: process.env.MODDABLE })

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
    spinner.succeed()

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
