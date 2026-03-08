// Colored console output helpers using ANSI escape codes.
// Replaces Gluegun's print utility and direct console.* calls.
// Uses process.stdout.write / process.stderr.write for consistency.

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
