// src/lib/adapter.ts
import type { OperationEvent } from './events.js'
import type { Prompter } from './prompter.js'

export type HostPlatform = 'mac' | 'lin' | 'win'

export interface AdapterContext {
  platform: HostPlatform
  arch: 'x64' | 'arm64'
  version?: string  // adapter-specific; format is adapter-defined
}

export interface VerifyResult {
  ok: boolean
  adapter: string      // name of the adapter (matches TargetAdapter.name)
  version?: string     // detected installed version
  missing?: string[]   // unmet requirements
}

export interface TargetAdapter {
  readonly name: string
  readonly platforms: HostPlatform[]

  install: (ctx: AdapterContext, prompter: Prompter) => AsyncGenerator<OperationEvent, void, undefined>
  update: (ctx: AdapterContext, prompter: Prompter) => AsyncGenerator<OperationEvent, void, undefined>
  teardown: (ctx: AdapterContext, prompter: Prompter) => AsyncGenerator<OperationEvent, void, undefined>
  verify: (ctx: AdapterContext) => Promise<VerifyResult>

  // Pure — returns env vars this adapter needs at build/scan time
  getEnvVars: (ctx: AdapterContext) => Record<string, string>

  // Optional — for toolchains needing shell script activation (e.g. ESP-IDF export.sh)
  getActivationScript?: (ctx: AdapterContext) => string | null
}
