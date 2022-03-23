import type { GluegunToolbox } from 'gluegun'

export type Device =
  | 'darwin'
  | 'linux'
  | 'windows_nt'
  | 'esp'
  | 'esp8266'
  | 'esp32'
  | 'wasm'
  | 'pico'

export interface XSDevToolbox extends GluegunToolbox {
  setup: Record<Device, () => Promise<void>>
  update: Record<Device, () => Promise<void>>
}
