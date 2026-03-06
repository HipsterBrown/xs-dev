import os from 'node:os'
import { execaCommand } from 'execa'
import { existsSync } from 'node:fs'
import upsert from '../patching/upsert'
import { getProfilePath } from './constants'
import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

function getBrewPath(): string {
  if (os.arch() === 'arm64') return '/opt/homebrew/bin'
  return '/usr/local/bin'
}

export async function* ensureHomebrew(prompter: Prompter): AsyncGenerator<OperationEvent> {
  try {
    const result = await execaCommand('which brew', { reject: false })
    const brewExists = result.exitCode === 0

    if (!brewExists) {
      const brewPath = getBrewPath()
      const homebrewEval = `eval "$(${brewPath}/brew shellenv)"`

      if (existsSync(brewPath)) {
        process.env.PATH = `${brewPath}:${String(process.env.PATH)}`
        yield { type: 'info', message: 'Homebrew found in PATH' }
        return
      }

      const shouldInstallBrew = await prompter.confirm(
        `The "brew" command is not available. Homebrew is required to install necessary dependencies. Would you like to setup Homebrew automatically?`,
      )

      if (shouldInstallBrew) {
        try {
          yield { type: 'step:start', message: 'Running Homebrew install script...' }
          await execaCommand(
            `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`,
            {
              shell: process.env.SHELL,
              stdio: 'inherit',
            },
          )
          const PROFILE_PATH = getProfilePath()
          await upsert(PROFILE_PATH, homebrewEval)
          process.env.PATH = `${brewPath}:${String(process.env.PATH)}`
          yield { type: 'step:done', message: 'Homebrew installed successfully' }
          return
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          yield { type: 'step:fail', message: `Unable to install Homebrew: ${message}` }
          return
        }
      }

      yield {
        type: 'step:fail',
        message: `Visit https://brew.sh/ to learn more about installing Homebrew. If you don't want to use Homebrew, please install the following packages manually before trying this command again.`,
      }
      return
    }

    yield { type: 'info', message: 'Homebrew is available' }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    yield { type: 'step:fail', message: `Error checking for Homebrew: ${message}` }
  }
}

export async function formulaeExists(formulae: string): Promise<boolean> {
  try {
    const result = await execaCommand(`brew list ${formulae}`, {
      shell: process.env.SHELL,
      reject: false,
    })
    return result.exitCode === 0
  } catch {
    return false
  }
}
