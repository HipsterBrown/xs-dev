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

// Result types for improved error handling
export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E }

export type SetupResult = Result<void>
export type BuildResult = Result<string> // output path
export type UpdateResult = Result<void>

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
