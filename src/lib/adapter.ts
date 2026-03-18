// src/lib/adapter.ts
import type { OperationEvent } from './events.js'

export type HostPlatform = 'mac' | 'lin' | 'win'

export interface AdapterContext {
  platform: HostPlatform
  arch: 'x64' | 'arm64'
}

export interface VerifyResult {
  ok: boolean
  adapter: string
  version?: string     // detected installed version
  missing?: string[]   // unmet requirements
}

export interface TargetAdapter {
  readonly name: string
  readonly platforms: HostPlatform[]

  install: (ctx: AdapterContext) => AsyncGenerator<OperationEvent>
  update: (ctx: AdapterContext) => AsyncGenerator<OperationEvent>
  teardown: (ctx: AdapterContext) => AsyncGenerator<OperationEvent>
  verify: (ctx: AdapterContext) => Promise<VerifyResult>

  // Pure — returns env vars this adapter needs at build/scan time
  getEnvVars: (ctx: AdapterContext) => Record<string, string>

  // Optional — for toolchains needing shell script activation (e.g. ESP-IDF export.sh)
  getActivationScript?: (ctx: AdapterContext) => string | null
}
