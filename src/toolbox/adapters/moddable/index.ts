import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { TargetAdapter, AdapterContext, VerifyResult } from '../interface.js'
import type { OperationEvent } from '../../../lib/events.js'
import { INSTALL_PATH } from '../../setup/constants.js'
import { getModdableVersion } from '../../setup/moddable.js'
import { installMac, updateMac, teardownMac } from './mac.js'
import { installLinux, updateLinux, teardownLinux } from './lin.js'
import { installWindows, updateWindows, teardownWindows } from './windows.js'
import type { PlatformSetupArgs } from '../../setup/types.js'
import type { Prompter } from '../../../lib/prompter.js'

function getBinPath(ctx: AdapterContext): string {
  return resolve(INSTALL_PATH, 'build', 'bin', ctx.platform, 'release')
}

export function parseModdableVersion(version: string | undefined): {
  release: string | undefined
  branch: string | undefined
  sourceRepo: string | undefined
} {
  if (version === undefined) {
    return { release: 'latest', branch: undefined, sourceRepo: undefined }
  }

  // Split on the first '@' only — HTTPS URLs don't contain '@'
  const atIdx = version.indexOf('@')
  const prefix = atIdx >= 0 ? version.slice(0, atIdx) : version
  const sourceRepo = atIdx >= 0 ? version.slice(atIdx + 1) : undefined

  if (prefix.startsWith('branch-')) {
    return { release: undefined, branch: prefix.slice('branch-'.length), sourceRepo }
  }
  if (prefix.startsWith('release-')) {
    return { release: prefix.slice('release-'.length), branch: undefined, sourceRepo }
  }
  // Unrecognized prefix: treat whole string as a release tag (safe fallback)
  return { release: prefix, branch: undefined, sourceRepo }
}

export const moddableAdapter: TargetAdapter = {
  name: 'moddable',
  platforms: ['mac', 'lin', 'win'],

  async *install(ctx: AdapterContext, prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    const { release, branch, sourceRepo } = parseModdableVersion(ctx.version)
    const args: PlatformSetupArgs = {
      release: release ?? 'latest',
      sourceRepo: sourceRepo ?? 'https://github.com/Moddable-OpenSource/moddable',
      branch,
    }
    if (ctx.platform === 'mac') yield* installMac(args, prompter)
    else if (ctx.platform === 'lin') yield* installLinux(args, prompter)
    else yield* installWindows(args, prompter)
  },

  async *update(ctx: AdapterContext, prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    if (ctx.platform === 'mac') yield* updateMac(ctx, prompter)
    else if (ctx.platform === 'lin') yield* updateLinux(ctx, prompter)
    else yield* updateWindows(ctx, prompter)
  },

  async *teardown(ctx: AdapterContext, _prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    if (ctx.platform === 'mac') yield* teardownMac(ctx)
    else if (ctx.platform === 'lin') yield* teardownLinux(ctx)
    else yield* teardownWindows(ctx)
  },

  async verify(ctx: AdapterContext): Promise<VerifyResult> {
    const missing: string[] = []

    if (process.env.MODDABLE === undefined || process.env.MODDABLE === '' || !existsSync(process.env.MODDABLE)) {
      missing.push('MODDABLE env var not set or path does not exist')
    }

    const binPath = getBinPath(ctx)
    if (!existsSync(binPath)) {
      missing.push(`build tools not found at ${binPath}`)
    }

    if (missing.length > 0) {
      return { ok: false, adapter: 'moddable', missing }
    }

    const versionResult = await getModdableVersion()
    return {
      ok: true,
      adapter: 'moddable',
      version: versionResult.success ? versionResult.data : undefined,
    }
  },

  getEnvVars(ctx: AdapterContext): Record<string, string> {
    const binPath = getBinPath(ctx)
    return {
      MODDABLE: INSTALL_PATH,
      PATH: `${binPath}:${process.env.PATH ?? ''}`,
    }
  },
}
