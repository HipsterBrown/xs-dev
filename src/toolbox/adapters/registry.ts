import type { TargetAdapter } from './interface.js'
import { moddableAdapter } from './moddable/index.js'
import { esp32Adapter } from './esp32/index.js'
import { picoAdapter } from './pico.js'
import { esp8266Adapter } from './esp8266.js'
import { nrf52Adapter } from './nrf52.js'
import { zephyrAdapter } from './zephyr.js'

export const adapters: Record<string, TargetAdapter> = {
  moddable: moddableAdapter,
  esp32: esp32Adapter,
  pico: picoAdapter,
  esp8266: esp8266Adapter,
  nrf52: nrf52Adapter,
  zephyr: zephyrAdapter,
}

export function getAdapter(name: string): TargetAdapter | undefined {
  return adapters[name]
}

// Maps a build target like "esp32/moddable_two" to its adapter by name prefix
export function resolveAdapterForTarget(targetPlatform: string): TargetAdapter | undefined {
  const name = Object.keys(adapters).find((key) => targetPlatform.startsWith(key))
  return name !== undefined ? adapters[name] : undefined
}
