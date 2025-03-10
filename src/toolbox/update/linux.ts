import os from 'os'
import { promisify } from 'util'
import { chmod } from 'fs'
import { print, system, filesystem, prompt } from 'gluegun'
import { INSTALL_PATH, MODDABLE_REPO, XSBUG_LOG_PATH } from '../setup/constants'
import type { SetupArgs } from '../setup/types'
import {
  fetchRelease,
  moddableExists,
  downloadReleaseTools,
} from '../setup/moddable'
import { execWithSudo, sourceEnvironment } from '../system/exec'

const chmodPromise = promisify(chmod)

export default async function ({
  branch,
  release,
  interactive,
}: SetupArgs): Promise<void> {
  await sourceEnvironment()

  // 0. ensure Moddable exists
  if (!moddableExists()) {
    print.error(
      'Moddable tooling required. Run `xs-dev setup` before trying again.',
    )
    process.exit(1)
  }

  print.info('Checking for SDK changes')

  const BUILD_DIR = filesystem.resolve(
    INSTALL_PATH,
    'build',
    'makefiles',
    'lin',
  )
  let rebuildTools = false

  if (release !== undefined && (branch === undefined || branch === null)) {
    // get tag for current repo
    const currentTag: string = await system.exec('git tag', {
      cwd: process.env.MODDABLE,
    })
    // get latest release tag
    const remoteRelease = await fetchRelease(release)

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

      spinner.info('Updating tool permissions')
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

      spinner.info('Reinstalling simulator')
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
      await execWithSudo('make install', {
        cwd: BUILD_DIR,
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

    const spinner = print.spin()
    spinner.start('Updating Moddable SDK!')

    spinner.info('Stashing any unsaved changes before committing')
    await system.exec('git stash', { cwd: process.env.MODDABLE })
    await system.exec(`git pull origin ${branch}`, {
      cwd: process.env.MODDABLE,
    })
    rebuildTools = true
    spinner.succeed()
  }

  if (rebuildTools) {
    const spinner = print.spin()
    spinner.start('Rebuilding platform tools')

    await system.exec('rm -rf build/{tmp,bin}', { cwd: process.env.MODDABLE })

    await system.exec('make', {
      cwd: BUILD_DIR,
      stdout: process.stdout,
    })
    spinner.succeed()

    spinner.start('Reinstalling simulator')
    await execWithSudo('make install', {
      cwd: BUILD_DIR,
      stdout: process.stdout,
    })
    spinner.succeed()

    if (system.which('npm') !== null) {
      spinner.start('Installing xsbug-log dependencies')
      await system.exec('npm install', { cwd: XSBUG_LOG_PATH })
      spinner.succeed()
    }

    print.success(
      'Moddable SDK successfully updated! Start the xsbug.app and run the "helloworld example": xs-dev run --example helloworld',
    )
  }
}
