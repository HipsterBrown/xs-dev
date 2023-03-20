import { type as platformType } from 'node:os';
import { system, print } from 'gluegun'
import { EXPORTS_FILE_PATH } from '../setup/constants';
import { Device } from '../../types';

function ensureAskPass(): void {
  const SUDO_ASKPASS = system.which('ssh-askpass')
  if (SUDO_ASKPASS === undefined) {
    print.warning('ssh-askpass required to prompt for password')
    process.exit(1)
  }
  process.env.SUDO_ASKPASS = SUDO_ASKPASS
}

/**
 * Ensure command can be run with sudo,
 * first attempting as non-interactive before falling back to ssh-askpass prompt
 **/
export async function execWithSudo(
  command: string,
  options: Record<string, unknown> = {}
): Promise<void> {
  try {
    await system.exec(
      `sudo --non-interactive --preserve-env ${command}`,
      options
    )
    return
  } catch (error) {
    if (error.toString().includes('password') === false) {
      ensureAskPass()
    } else {
      throw error
    }
  }

  await system.exec(`sudo --askpass --preserve-env ${command}`, options)
}

/**
 * Set updated env from user shell as process.env
 */
export async function sourceEnvironment(): Promise<void> {
  const OS = platformType().toLowerCase() as Device

  if (OS !== 'windows_nt') {
    try {
      const result = await system.spawn(`source ${EXPORTS_FILE_PATH} && env`, {
        shell: process.env.SHELL,
      })
      if (typeof result.stdout === 'string' || result.stdout instanceof Buffer) {
        const localEnv = Object.fromEntries(result.stdout.toString().split('\n').map((field: string) => field?.split('=')))
        if ('PATH' in localEnv) process.env = localEnv
      }
    } catch (error) {
      console.warn('Unable to source the environment settings:', error)
    }
  }
}
