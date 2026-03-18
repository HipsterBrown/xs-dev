import type { TargetAdapter } from './interface.js'
import { moddableAdapter } from './moddable/index.js'
import { esp32Adapter } from './esp32/index.js'

export const adapters: Record<string, TargetAdapter> = {
  moddable: moddableAdapter,
  esp32: esp32Adapter,
}

export function getAdapter(name: string): TargetAdapter | undefined {
  return adapters[name]
}

// Maps a build target like "esp32/moddable_two" to its adapter by name prefix
export function resolveAdapterForTarget(targetPlatform: string): TargetAdapter | undefined {
  const name = Object.keys(adapters).find((key) => targetPlatform.startsWith(key))
  return name !== undefined ? adapters[name] : undefined
}
