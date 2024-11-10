import { system } from 'gluegun'

export function detectPython(): string | null {
  if (system.which('python') !== null) return 'python'
  if (system.which('python3') !== null) return 'python3'
  return null
}

export async function getPythonVersion(): Promise<string | null> {
  const python = detectPython()
  if (python !== null) {
    return (
      (await system.run(`${python} --version`)).split(' ').pop()?.trim() ?? null
    )
  }
  return null
}
