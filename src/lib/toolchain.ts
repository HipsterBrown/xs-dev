// src/lib/toolchain.ts
import type { OperationEvent } from './events.js'
import type { Prompter } from './prompter.js'

export type HostPlatform = 'mac' | 'lin' | 'win'

export interface HostContext {
  platform: HostPlatform
  arch: 'x64' | 'arm64'
  version?: string  // toolchain-specific; format is toolchain-defined
}

export interface VerifyResult {
  ok: boolean
  toolchain: string    // name of the toolchain (matches Toolchain.name)
  version?: string     // detected installed version
  missing?: string[]   // unmet requirements
}

export interface Toolchain {
  readonly name: string
  readonly platforms: HostPlatform[]

  install: (ctx: HostContext, prompter: Prompter) => AsyncGenerator<OperationEvent, void, undefined>
  update: (ctx: HostContext, prompter: Prompter) => AsyncGenerator<OperationEvent, void, undefined>
  teardown: (ctx: HostContext, prompter: Prompter) => AsyncGenerator<OperationEvent, void, undefined>
  verify: (ctx: HostContext) => Promise<VerifyResult>

  // Pure — returns env vars this toolchain needs at build/scan time
  getEnvVars: (ctx: HostContext) => Record<string, string>

  // Optional — for toolchains needing shell script activation (e.g. ESP-IDF export.sh)
  getActivationScript?: (ctx: HostContext) => string | null
}
