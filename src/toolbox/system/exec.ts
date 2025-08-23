import { type as platformType } from 'node:os'
import { system } from 'gluegun'
import { EXPORTS_FILE_PATH } from '../setup/constants'
import type { Device, Result } from '../../types'
import { success, failure, wrapAsync } from './errors'

function ensureAskPass(): Result<void> {
  const SUDO_ASKPASS = system.which('ssh-askpass')
  if (SUDO_ASKPASS === null || SUDO_ASKPASS === undefined) {
    return failure('ssh-askpass required to prompt for password')
  }
  process.env.SUDO_ASKPASS = SUDO_ASKPASS
  return success(undefined)
}

/**
 * Ensure command can be run with sudo,
 * first attempting as non-interactive before falling back to ssh-askpass prompt
 **/
export async function execWithSudo(
  command: string,
  options: Record<string, unknown> = {},
): Promise<Result<void>> {
  try {
    await system.exec(
      `sudo --non-interactive --preserve-env ${command}`,
      options,
    )
    return success(undefined)
  } catch (error) {
    if (error.toString().includes('password') === true) {
      const askPassResult = ensureAskPass()
      if (!askPassResult.success) {
        return askPassResult
      }
    } else {
      return failure(`Failed to execute sudo command: ${error}`)
    }
  }

  return wrapAsync(async () => {
    await system.exec(`sudo --askpass --preserve-env ${command}`, options)
  })
}

/**
 * Use Policykit pkexec to run the command as an admin user
 */
export async function pkexec(
  command: string,
  options: Record<string, unknown> = {},
): Promise<Result<void>> {
  return wrapAsync(async () => {
    await system.exec(`pkexec ${command}`, options)
  })
}

/**
 * Utility for updating in-memory process.env after running a command
 */
async function updateProcessEnv(command: string): Promise<Result<void>> {
  const OS = platformType().toLowerCase() as Device

  if (OS === 'windows_nt') {
    return success(undefined) // No-op on Windows
  }

  return wrapAsync(async () => {
    const result = await system.spawn(`${command} && env`, {
      shell: process.env.SHELL,
    })
    if (
      typeof result.stdout === 'string' ||
      result.stdout instanceof Buffer
    ) {
      const localEnv = Object.fromEntries(
        (result.stdout.toString() as string)
          .split('\n')
          .map((field: string) => field?.split('='))
          .filter((pair) => pair.length === 2),
      )
      if ('PATH' in localEnv) process.env = localEnv
    }
  })
}

/**
 * Set updated env from user shell as process.env
 */
export async function sourceEnvironment(): Promise<Result<void>> {
  return updateProcessEnv(`source ${EXPORTS_FILE_PATH}`)
}

/**
 * Set updated env from IDF_PATH/export.sh as process.env
 */
export async function sourceIdf(): Promise<Result<void>> {
  return updateProcessEnv(`source $IDF_PATH/export.sh 1> /dev/null`)
}

/**
 * Set updated env from IDF_PYTHON_ENV_PATH as process.env
 */
export async function sourceIdfPythonEnv(): Promise<Result<void>> {
  return updateProcessEnv(
    `source ${process.env.IDF_PYTHON_ENV_PATH ?? ''}/bin/activate`,
  )
}
