// Colored console output helpers using ANSI escape codes.
// Replaces Gluegun's print utility and direct console.* calls.
// Uses process.stdout.write / process.stderr.write for consistency.
// ANSI codes are stripped automatically when output is not a TTY (e.g. pipes, CI log capture).

const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const RESET = '\x1b[0m'

function colorizeStdout(code: string, message: string): string {
  return process.stdout.isTTY ? `${code}${message}${RESET}` : message
}

function colorizeStderr(code: string, message: string): string {
  return process.stderr.isTTY ? `${code}${message}${RESET}` : message
}

export function info(message: string): void {
  process.stdout.write(colorizeStdout(CYAN, message) + '\n')
}

export function success(message: string): void {
  process.stdout.write(colorizeStdout(GREEN, message) + '\n')
}

export function warn(message: string): void {
  const prefix = colorizeStderr(YELLOW, 'Warning:')
  process.stderr.write(`${prefix} ${message}\n`)
}

export function error(message: string): void {
  const prefix = colorizeStderr(RED, 'Error:')
  process.stderr.write(`${prefix} ${message}\n`)
}
