import type { GluegunToolbox } from 'gluegun'
import type { PlatformSetupArgs, SetupArgs } from './toolbox/setup/types'
import type { BuildArgs } from './toolbox/build/index'

export type Device =
  | 'darwin'
  | 'mac'
  | 'linux'
  | 'lin'
  | 'windows_nt'
  | 'windows'
  | 'win'
  | 'esp8266'
  | 'esp32'
  | 'wasm'
  | 'pico'
  | 'nrf52'

export interface XSDevToolbox extends GluegunToolbox {
  setup: Record<
    Device,
    | (() => Promise<void>)
    | ((args: SetupArgs | PlatformSetupArgs) => Promise<void>)
  >
  update: Record<
    Device,
    (() => Promise<void>) | ((args: SetupArgs) => Promise<void>)
  >
  build: (args: BuildArgs) => Promise<void>
}
