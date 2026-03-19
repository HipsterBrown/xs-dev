import type { OperationEvent } from './events.js'
import type { Prompter } from './prompter.js'

export type HostPlatform = 'mac' | 'lin' | 'win'

export interface HostContext {
  platform: HostPlatform
  arch: 'x64' | 'arm64'
  version?: string
}

export interface VerifyResult {
  ok: boolean
  toolchain: string
  version?: string
  missing?: string[]
}

export interface Toolchain {
  readonly name: string
  readonly platforms: HostPlatform[]

  install: (ctx: HostContext, prompter: Prompter) => AsyncGenerator<OperationEvent, void, undefined>
  update: (ctx: HostContext, prompter: Prompter) => AsyncGenerator<OperationEvent, void, undefined>
  teardown: (ctx: HostContext, prompter: Prompter) => AsyncGenerator<OperationEvent, void, undefined>
  verify: (ctx: HostContext) => Promise<VerifyResult>

  getEnvVars: (ctx: HostContext) => Record<string, string>

  getActivationScript?: (ctx: HostContext) => string | null
}
