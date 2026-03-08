import os from 'node:os'
import { promisify } from 'node:util'
import { chmod } from 'node:fs'
import { execaCommand } from '../system/execa.js'
import { resolve } from 'node:path'
import { INSTALL_PATH, MODDABLE_REPO, XSBUG_LOG_PATH } from '../setup/constants'
import {
  fetchRelease,
  moddableExists,
  downloadReleaseTools,
  MissingReleaseAssetError,
} from '../setup/moddable'
import type { SetupArgs } from '../setup/types'
import { sourceEnvironment } from '../system/exec'
import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

const chmodPromise = promisify(chmod)

export default async function* updateMac(
  args: Record<string, unknown>,
  prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  const setupArgs = args as Record<string, unknown> & SetupArgs
  const { branch, release, interactive = false } = setupArgs

  yield { type: 'info', message: 'Checking for SDK changes' }

  await sourceEnvironment()

  // 0. ensure Moddable exists
  if (!moddableExists()) {
    yield {
      type: 'step:fail',
      message: 'Moddable tooling required. Run `xs-dev setup` before trying again.',
    }
    return
  }

  let rebuildTools = false

  if (release !== undefined && (branch === undefined || branch === null)) {
    try {
      // get tag for current repo
      const currentTagResult = await execaCommand('git tag', {
        cwd: process.env.MODDABLE,
      })
      const currentTag = currentTagResult.stdout

      // get release tag
      const remoteRelease = await fetchRelease(release)
      if (remoteRelease === null) {
        yield { type: 'step:fail', message: `Failed to fetch release: ${release}` }
        return
      }

      if (currentTag?.trim() === remoteRelease.tag_name) {
        yield { type: 'step:done', message: 'Moddable SDK already up to date!' }
        return
      }

      if (remoteRelease.assets.length === 0) {
        yield {
          type: 'warning',
          message: `Moddable release ${release} does not have any pre-built assets.`,
        }
        rebuildTools =
          !interactive ||
          (await prompter.confirm(
            'Would you like to continue updating and build the SDK locally?',
            false,
          ))

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
          // Use rm -rf for directory removal
          const { execa } = await import('execa')
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
            'mac',
            'release',
          )
          const DEBUG_BIN_PATH = resolve(
            INSTALL_PATH,
            'build',
            'bin',
            'mac',
            'debug',
          )

          // Create directories
          const { mkdir } = await import('node:fs/promises')
          await mkdir(BIN_PATH, { recursive: true })
          await mkdir(DEBUG_BIN_PATH, { recursive: true })

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
              throw new Error(String(error))
            }
          }

          yield { type: 'info', message: 'Updating tool permissions' }
          const { readdir } = await import('node:fs/promises')
          const tools = await readdir(BIN_PATH)
          await Promise.all(
            tools.map(async (tool) => {
              if (tool.endsWith('.app')) {
                const mainPath = resolve(
                  BIN_PATH,
                  tool,
                  'Contents',
                  'MacOS',
                  'main',
                )
                await chmodPromise(mainPath, 0o751)
              } else {
                await chmodPromise(resolve(BIN_PATH, tool), 0o751)
              }
              const { copyFile } = await import('node:fs/promises')
              await copyFile(
                resolve(BIN_PATH, tool),
                resolve(DEBUG_BIN_PATH, tool),
              )
            }),
          )

          // Check for npm
          const npmCheck = await execaCommand('which npm', { reject: false })
          if (npmCheck.exitCode === 0) {
            yield { type: 'step:start', message: 'Installing xsbug-log dependencies' }
            await execaCommand('npm install', { cwd: XSBUG_LOG_PATH })
            yield { type: 'step:done' }
          }

          yield {
            type: 'step:done',
            message: 'Moddable SDK successfully updated! Start the xsbug.app and run the "helloworld example": xs-dev run --example helloworld',
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
      const currentRev = currentRevResult.stdout

      const remoteRevResult = await execaCommand(
        `git ls-remote origin refs/heads/${branch}`,
        { cwd: process.env.MODDABLE },
      )
      const remoteRev = remoteRevResult.stdout

      if (remoteRev?.split('\t').shift() === currentRev.trim()) {
        yield { type: 'step:done', message: 'Moddable SDK already up to date!' }
        return
      }

      rebuildTools = true

      yield { type: 'step:start', message: 'Updating Moddable SDK!' }
      yield { type: 'info', message: 'Stashing any unsaved changes before committing' }
      await execaCommand('git stash', { cwd: process.env.MODDABLE, reject: false })
      await execaCommand(`git pull origin ${branch}`, {
        cwd: process.env.MODDABLE,
      })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error in branch update: ${String(error)}` }
      return
    }
  }

  if (rebuildTools) {
    try {
      const BUILD_DIR = resolve(
        process.env.MODDABLE ?? '',
        'build',
        'bin',
      )
      const TMP_DIR = resolve(
        process.env.MODDABLE ?? '',
        'build',
        'tmp',
      )

      // Remove directories
      const { execa } = await import('execa')
      await execa('rm', ['-rf', BUILD_DIR], { reject: false })
      await execa('rm', ['-rf', TMP_DIR], { reject: false })

      yield { type: 'step:start', message: 'Rebuilding platform tools' }
      // install release assets or build
      await execaCommand('make', {
        cwd: resolve(
          String(process.env.MODDABLE),
          'build',
          'makefiles',
          'mac',
        ),
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
        message: 'Moddable SDK successfully updated! Start the xsbug.app and run the "helloworld example": xs-dev run --example helloworld',
      }
    } catch (error) {
      yield { type: 'step:fail', message: `Error rebuilding tools: ${String(error)}` }
    }
  }
}
