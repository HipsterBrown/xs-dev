import { system } from 'gluegun'
import type { Result } from '../../types'
import { failure, wrapAsync } from './errors'

export function detectPython(): string | null {
  if (system.which('python') !== null) return 'python'
  if (system.which('python3') !== null) return 'python3'
  return null
}

export async function getPythonVersion(): Promise<Result<string>> {
  const python = detectPython()
  if (python === null) {
    return failure('Python not available on this system')
  }

  return wrapAsync(async () => {
    const output = await system.run(`${python} --version`)
    const version = output.split(' ').pop()?.trim()
    if (version) return version
    throw new Error('Python version not found.')
  })
}
