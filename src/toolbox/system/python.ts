import { execaCommand } from './execa.js'
import type { Result } from '../../types'
import { failure, wrapAsync } from './errors'
import { which } from './exec'

export function detectPython(): string | null {
  if (which('python') !== null) return 'python'
  if (which('python3') !== null) return 'python3'
  return null
}

export async function getPythonVersion(): Promise<Result<string>> {
  const python = detectPython()
  if (python === null) {
    return failure('Python not available on this system')
  }

  return await wrapAsync(async () => {
    const result = await execaCommand(`${python} --version`)
    const version = String(result.stdout).split(' ').pop()?.trim()
    if (typeof version !== "undefined") return version
    throw new Error('Python version not found.')
  })
}
