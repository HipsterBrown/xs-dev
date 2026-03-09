import os from 'node:os'
import { mkdir, readdir, copyFile, chmod } from 'node:fs/promises'
import { execaCommand, execa } from '../system/execa.js'
import { resolve } from 'node:path'
import { INSTALL_PATH, MODDABLE_REPO, XSBUG_LOG_PATH } from '../setup/constants'
import type { SetupArgs } from '../setup/types'
import {
  fetchRelease,
  moddableExists,
  downloadReleaseTools,
} from '../setup/moddable'
import { execWithSudo, sourceEnvironment } from '../system/exec'
import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

export default async function* updateLin(
  args: Record<string, unknown>,
  prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  const setupArgs = args as unknown as SetupArgs
  const { branch, release } = setupArgs

  await sourceEnvironment()

  // 0. ensure Moddable exists
  if (!moddableExists()) {
    yield {
      type: 'step:fail',
      message: 'Moddable tooling required. Run `xs-dev setup` before trying again.',
    }
    return
  }

  yield { type: 'info', message: 'Checking for SDK changes' }

  const BUILD_DIR = resolve(
    INSTALL_PATH,
    'build',
    'makefiles',
    'lin',
  )
  let rebuildTools = false

  if (release !== undefined && (branch === undefined || branch === null)) {
    try {
      // get tag for current repo
      const currentTagResult = await execaCommand('git tag', {
        cwd: process.env.MODDABLE,
      })
      const currentTag = String(currentTagResult.stdout)

      // get latest release tag
      const remoteReleaseResult = await fetchRelease(release)
      if (!remoteReleaseResult.success) {
        yield { type: 'step:fail', message: `Failed to fetch release: ${release}` }
        return
      }
      const remoteRelease = remoteReleaseResult.data

      if (typeof currentTag === 'string' && currentTag.trim() === remoteRelease.tag_name) {
        yield { type: 'step:done', message: 'Moddable SDK already up to date!' }
        return
      }

      if (remoteRelease.assets.length === 0) {
        yield {
          type: 'warning',
          message: `Moddable release ${release} does not have any pre-built assets.`,
        }
        rebuildTools = await prompter.confirm(
          'Would you like to continue updating and build the SDK locally?',
          false,
        )

        if (!rebuildTools) {
          yield {
            type: 'info',
            message: 'Please select another release version with pre-built assets: https://github.com/Moddable-OpenSource/moddable/releases',
          }
          return
        }
      }

      yield { type: 'step:start', message: 'Updating Moddable SDK!' }

      // Remove and clone
      try {
        if (process.env.MODDABLE !== undefined) {
          await execa('rm', ['-rf', process.env.MODDABLE])
        }
        await execaCommand(
          `git clone ${MODDABLE_REPO} ${INSTALL_PATH} --depth 1 --branch ${remoteRelease.tag_name} --single-branch`,
        )
      } catch (error) {
        yield { type: 'step:fail', message: `Error cloning repo: ${String(error)}` }
        return
      }

      if (!rebuildTools) {
        try {
          const BIN_PATH = resolve(
            INSTALL_PATH,
            'build',
            'bin',
            'lin',
            'release',
          )
          const DEBUG_BIN_PATH = resolve(
            INSTALL_PATH,
            'build',
            'bin',
            'lin',
            'debug',
          )

          // Create directories
          await mkdir(BIN_PATH, { recursive: true })
          await mkdir(DEBUG_BIN_PATH, { recursive: true })

          const isArm = os.arch() === 'arm64'
          const assetName = isArm
            ? 'moddable-tools-lin64arm.zip'
            : 'moddable-tools-lin64.zip'

          yield { type: 'info', message: 'Downloading release tools' }
          await downloadReleaseTools({
            writePath: BIN_PATH,
            assetName,
            release: remoteRelease,
          })

          yield { type: 'info', message: 'Updating tool permissions' }
          const tools = await readdir(BIN_PATH)
          await Promise.all(
            tools.map(async (tool) => {
              await chmod(resolve(BIN_PATH, tool), 0o751)
              await copyFile(
                resolve(BIN_PATH, tool),
                resolve(DEBUG_BIN_PATH, tool),
              )
            }),
          )

          yield { type: 'info', message: 'Reinstalling simulator' }
          const simDir = resolve(
            BUILD_DIR,
            '..',
            '..',
            'tmp',
            'lin',
            'debug',
            'simulator',
          )
          await mkdir(simDir, { recursive: true })

          await execaCommand(
            `mcconfig -m -p x-lin ${resolve(
              INSTALL_PATH,
              'tools',
              'xsbug',
              'manifest.json',
            )}`,
          )
          await execaCommand(
            `mcconfig -m -p x-lin ${resolve(
              INSTALL_PATH,
              'tools',
              'mcsim',
              'manifest.json',
            )}`,
          )
          await execWithSudo('make install', {
            cwd: BUILD_DIR,
            stdio: 'inherit',
          })

          // Check for npm
          const npmCheck = await execaCommand('which npm', { reject: false })
          if (npmCheck.exitCode === 0) {
            yield { type: 'step:start', message: 'Installing xsbug-log dependencies' }
            await execaCommand('npm install', { cwd: XSBUG_LOG_PATH })
            yield { type: 'step:done' }
          }

          yield {
            type: 'step:done',
            message: 'Moddable SDK successfully updated! Start the xsbug and run the "helloworld example": xs-dev run --example helloworld',
          }
        } catch (error) {
          yield {
            type: 'step:fail',
            message: `Error downloading/installing tools: ${String(error)}`,
          }
          return
        }
      }
    } catch (error) {
      yield { type: 'step:fail', message: `Error in release update: ${String(error)}` }
      return
    }
  }

  if (typeof branch === 'string') {
    try {
      const currentRevResult = await execaCommand(`git rev-parse ${branch}`, {
        cwd: process.env.MODDABLE,
      })
      const currentRev = String(currentRevResult.stdout)

      const remoteRevResult = await execaCommand(
        `git ls-remote origin refs/heads/${branch}`,
        { cwd: process.env.MODDABLE },
      )
      const remoteRev = String(remoteRevResult.stdout)

      if (remoteRev.split('\t').shift() === currentRev.trim()) {
        yield { type: 'step:done', message: 'Moddable SDK already up to date!' }
        return
      }

      yield { type: 'step:start', message: 'Updating Moddable SDK!' }
      yield { type: 'info', message: 'Stashing any unsaved changes before committing' }
      await execaCommand('git stash', { cwd: process.env.MODDABLE, reject: false })
      await execaCommand(`git pull origin ${branch}`, {
        cwd: process.env.MODDABLE,
      })
      rebuildTools = true
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error in branch update: ${String(error)}` }
      return
    }
  }

  if (rebuildTools) {
    try {
      yield { type: 'step:start', message: 'Rebuilding platform tools' }

      await execa('bash', ['-c', 'rm -rf build/{tmp,bin}'], { cwd: process.env.MODDABLE, reject: false })

      await execaCommand('make', {
        cwd: BUILD_DIR,
        stdio: 'inherit',
      })
      yield { type: 'step:done' }

      yield { type: 'step:start', message: 'Reinstalling simulator' }
      await execWithSudo('make install', {
        cwd: BUILD_DIR,
        stdio: 'inherit',
      })
      yield { type: 'step:done' }

      // Check for npm
      const npmCheck = await execaCommand('which npm', { reject: false })
      if (npmCheck.exitCode === 0) {
        yield { type: 'step:start', message: 'Installing xsbug-log dependencies' }
        await execaCommand('npm install', { cwd: XSBUG_LOG_PATH })
        yield { type: 'step:done' }
      }

      yield {
        type: 'step:done',
        message: 'Moddable SDK successfully updated! Start the xsbug and run the "helloworld example": xs-dev run --example helloworld',
      }
    } catch (error) {
      yield { type: 'step:fail', message: `Error rebuilding tools: ${String(error)}` }
    }
  }
}
