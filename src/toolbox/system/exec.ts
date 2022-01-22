import { system, print } from 'gluegun'

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
