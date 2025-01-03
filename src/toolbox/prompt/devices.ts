import type { Device } from '../../types'

export const DEVICE_ALIAS: Record<Device | 'esp', Device> = Object.freeze({
  esp: 'esp8266',
  esp8266: 'esp8266',
  darwin: 'mac',
  mac: 'mac',
  windows_nt: 'win',
  windows: 'win',
  win: 'win',
  linux: 'lin',
  lin: 'lin',
  esp32: 'esp32',
  wasm: 'wasm',
  pico: 'pico',
  nrf52: 'nrf52',
})
