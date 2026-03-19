import type { Toolchain } from './interface.js'
import { moddableToolchain } from './moddable/index.js'
import { esp32Toolchain } from './esp32/index.js'
import { picoToolchain } from './pico.js'
import { esp8266Toolchain } from './esp8266.js'
import { nrf52Toolchain } from './nrf52.js'
import { zephyrToolchain } from './zephyr.js'
import { wasmToolchain } from './wasm.js'

export const toolchains: Record<string, Toolchain> = {
  moddable: moddableToolchain,
  esp32: esp32Toolchain,
  pico: picoToolchain,
  esp8266: esp8266Toolchain,
  nrf52: nrf52Toolchain,
  zephyr: zephyrToolchain,
  wasm: wasmToolchain,
}

export function getToolchain(name: string): Toolchain | undefined {
  return toolchains[name]
}

// Maps a build target like "esp32/moddable_two" to its toolchain by name prefix
export function resolveToolchain(targetPlatform: string): Toolchain | undefined {
  const name = Object.keys(toolchains).find((key) => targetPlatform.startsWith(key))
  return name !== undefined ? toolchains[name] : undefined
}
