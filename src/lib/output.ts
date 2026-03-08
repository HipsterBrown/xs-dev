// Colored console output helpers using ANSI escape codes.
// Replaces Gluegun's print utility and direct console.* calls.
// Uses process.stdout.write / process.stderr.write for consistency.

/**
 * Returns whether the current session is interactive.
 * CI=true means non-interactive (standard CI convention).
 * CI=false explicitly opts back into interactive mode.
 * The defaultValue is used when CI is not set.
 */
export function isInteractive(defaultValue = true): boolean {
  if (typeof process.env.CI !== 'undefined') {
    return process.env.CI === 'false'
  }
  return defaultValue
}

const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const RESET = '\x1b[0m'

export function info(message: string): void {
  process.stdout.write(`${CYAN}${message}${RESET}\n`)
}

export function success(message: string): void {
  process.stdout.write(`${GREEN}${message}${RESET}\n`)
}

export function warn(message: string): void {
  process.stderr.write(`${YELLOW}Warning:${RESET} ${message}\n`)
}

export function error(message: string): void {
  process.stderr.write(`${RED}Error:${RESET} ${message}\n`)
}
