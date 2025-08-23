import { system } from 'gluegun'
import type { Result } from '../../types'
import { success, wrapAsync } from './errors'

export function detectPython(): string | null {
  if (system.which('python') !== null) return 'python'
  if (system.which('python3') !== null) return 'python3'
  return null
}

export async function getPythonVersion(): Promise<Result<string | null>> {
  const python = detectPython()
  if (python === null) {
    return success(null)
  }

  return wrapAsync(async () => {
    const output = await system.run(`${python} --version`)
    return output.split(' ').pop()?.trim() ?? null
  })
}
