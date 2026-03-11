import { readFile, writeFile } from 'node:fs/promises'

export type Manifest = Record<string, unknown>

export async function readManifest(path: string): Promise<Manifest> {
  const raw = await readFile(path, 'utf8')
  return JSON.parse(raw) as Manifest
}

export async function writeManifest(path: string, manifest: Manifest): Promise<void> {
  await writeFile(path, JSON.stringify(manifest, null, 2), 'utf8')
}

function getTarget(manifest: Manifest, device: string): Manifest {
  if (device === '') return manifest
  manifest.platforms ??= {}
  ;(manifest.platforms as Record<string, unknown>)[device] ??= {}
  return (manifest.platforms as Record<string, unknown>)[device] as Manifest
}

export function addInclude(manifest: Manifest, modulePath: string, device = ''): Manifest {
  const clone = structuredClone(manifest) as Manifest
  const target = getTarget(clone, device)
  if (!('include' in target)) {
    target.include = []
  }
  if (typeof target.include === 'string') {
    target.include = [target.include]
  }
  const includes = (target.include as unknown[]).filter((x): x is string => typeof x === 'string')
  if (!includes.includes(modulePath)) {
    includes.push(modulePath)
  }
  // Moddable manifests use a bare string for a single include, array for multiple
  if (includes.length === 1) {
    target.include = includes[0]
  } else {
    target.include = includes
  }
  return clone
}

export function removeInclude(
  manifest: Manifest,
  moduleName: string,
  device = '',
): { manifest: Manifest; removed: string[] } {
  const clone = structuredClone(manifest) as Manifest

  // If device specified but platform doesn't exist in manifest, nothing to remove
  if (device !== '' && (!(clone.platforms as Record<string, unknown> | undefined)?.[device])) {
    return { manifest: clone, removed: [] }
  }

  const target = getTarget(clone, device)
  if (!('include' in target)) {
    return { manifest: clone, removed: [] }
  }
  if (typeof target.include === 'string') {
    target.include = [target.include]
  }
  const includes = (target.include as unknown[]).filter((x): x is string => typeof x === 'string')
  const toRemove = includes.filter((mod) => mod.includes(moduleName))
  const remaining = includes.filter((mod) => !mod.includes(moduleName))
  // Moddable manifests use a bare string for a single include, array for multiple
  if (remaining.length === 1) {
    target.include = remaining[0]
  } else if (remaining.length === 0) {
    delete target.include
  } else {
    target.include = remaining
  }
  return { manifest: clone, removed: toRemove }
}
