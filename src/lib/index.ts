// Core setup operations
export { default as setupMac } from '../toolbox/setup/mac.js'
export { default as setupLinux } from '../toolbox/setup/lin.js'
export { default as setupWindows } from '../toolbox/setup/windows.js'
export { default as setupEsp32 } from '../toolbox/setup/esp32.js'
export { default as setupEsp8266 } from '../toolbox/setup/esp8266.js'
export { default as setupPico } from '../toolbox/setup/pico.js'
export { default as setupNrf52 } from '../toolbox/setup/nrf52.js'
export { default as setupWasm } from '../toolbox/setup/wasm.js'
export { default as setupZephyr } from '../toolbox/setup/zephyr.js'

// Core update operations
export { default as updateMac } from '../toolbox/update/mac.js'
export { default as updateLinux } from '../toolbox/update/lin.js'
export { default as updateWindows } from '../toolbox/update/windows.js'
export { default as updateEsp32 } from '../toolbox/update/esp32.js'
export { default as updateEsp8266 } from '../toolbox/update/esp8266.js'
export { default as updatePico } from '../toolbox/update/pico.js'
export { default as updateNrf52 } from '../toolbox/update/nrf52.js'
export { default as updateWasm } from '../toolbox/update/wasm.js'

// Build operations
export { default as build } from '../toolbox/build/index.js'

// Interfaces and utilities
export type { OperationEvent } from './events.js'
export type { Prompter, Choice } from './prompter.js'
export { createInteractivePrompter, createNonInteractivePrompter } from './prompter.js'
export { parallel } from './parallel.js'

// Types
export type { SetupArgs, PlatformSetupArgs } from '../toolbox/setup/types.js'
export type { Device } from '../types.js'
