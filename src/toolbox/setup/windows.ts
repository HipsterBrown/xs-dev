import { execSync } from 'node:child_process'
import { EXPORTS_FILE_PATH } from './constants.js'
import upsert from '../patching/upsert.js'

export function which(bin: string): string | null {
  try {
    const result = execSync(`where ${bin}`, { stdio: 'pipe' }).toString().trim()
    return result.length > 0 ? result : null
  } catch {
    return null
  }
}

export async function setEnv(
  name: string,
  permanentValue: string,
  envValue?: string,
): Promise<void> {
  await upsert(EXPORTS_FILE_PATH, `set "${name}=${permanentValue}"`)
  process.env[name] = envValue ?? permanentValue
}

export async function addToPath(path: string): Promise<void> {
  const newPath = `${path};${process.env.PATH ?? ''}`
  await setEnv('PATH', `${path};%PATH%`, newPath)
}
