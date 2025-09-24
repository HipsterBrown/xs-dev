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
