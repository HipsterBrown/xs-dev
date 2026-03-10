import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { homedir } from 'node:os'
import { satisfies } from 'semver'
import { execa } from '../../toolbox/system/execa.js'
import {
  PlatformManifestSchema,
  type PlatformTarget,
  type PlatformManifest,
  type Dependency,
  type ResolvedEnvironment,
  type DependencyStatus,
  type LifecycleOperation,
  type HostPlatform,
} from '../target.js'

// eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
const dirname_ = dirname(require.resolve('./platform.json'))

function expandTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\$([A-Z_][A-Z0-9_]*)/g, (_, key: string) => vars[key] ?? '')
}

export class Esp32Platform implements PlatformTarget {
  readonly manifest: PlatformManifest

  private constructor(manifest: PlatformManifest) {
    this.manifest = manifest
  }

  static async load(): Promise<Esp32Platform> {
    const raw = await readFile(resolve(dirname_, 'platform.json'), 'utf-8')
    return new Esp32Platform(PlatformManifestSchema.parse(JSON.parse(raw)))
  }

  readonly supports = (op: LifecycleOperation, host: HostPlatform): boolean => {
    return this.manifest.capabilities[op][host]
  }

  readonly resolveEnvironment = async (
    overrides?: Record<string, string>,
  ): Promise<ResolvedEnvironment> => {
    const HOME = homedir()
    const baseVars: Record<string, string> = {
      HOME,
      ...(process.env as Record<string, string>),
    }

    // Step 1: expand static env vars from manifest defaults + overrides
    const staticEnv: Record<string, string> = {}
    const envConfig = this.manifest.env ?? {}
    for (const [key, def] of Object.entries(envConfig)) {
      const value = overrides?.[key] ?? def.defaultPath
      if (value !== undefined && value !== null && value !== '') {
        staticEnv[key] = expandTemplate(value, baseVars)
      }
    }

    // Step 2: if no activation scripts, return static env
    const scripts = this.manifest.activation?.scripts ?? []
    if (scripts.length === 0) {
      return {
        static: staticEnv,
        activated: { ...(process.env as Record<string, string>), ...staticEnv },
        activationSucceeded: true,
      }
    }

    // Step 3: expand script paths using static env
    const allVars = { ...baseVars, ...staticEnv }
    const expandedScripts = scripts.map(s => expandTemplate(s, allVars))

    // Step 4: verify scripts exist before attempting to source
    const missing = expandedScripts.filter(s => !existsSync(s))
    if (missing.length > 0) {
      return {
        static: staticEnv,
        activated: { ...(process.env as Record<string, string>), ...staticEnv },
        activationSucceeded: false,
        activationErrors: missing.map(s => `${s} not found`),
      }
    }

    // Step 5: source scripts in subprocess and capture env via null-byte delimiters
    try {
      const sourceCmd = expandedScripts.map(s => `source "${s}"`).join(' && ')
      const { stdout } = await execa(
        'bash',
        ['-c', `${sourceCmd} && env -0`],
        { env: { ...(process.env as Record<string, string>), ...staticEnv } },
      )

      const activated: Record<string, string> = {}
      const stdoutStr = typeof stdout === 'string' ? stdout : ''
      for (const line of stdoutStr.split('\0')) {
        const idx = line.indexOf('=')
        if (idx > 0) {
          activated[line.slice(0, idx)] = line.slice(idx + 1)
        }
      }

      return { static: staticEnv, activated, activationSucceeded: true }
    } catch (error) {
      return {
        static: staticEnv,
        activated: { ...(process.env as Record<string, string>), ...staticEnv },
        activationSucceeded: false,
        activationErrors: [error instanceof Error ? error.message : String(error)],
      }
    }
  }

  readonly checkDependencies = async (): Promise<DependencyStatus[]> => {
    const host = process.platform as HostPlatform

    const applicable = Object.entries(this.manifest.dependencies).filter(
      ([, dep]) => (dep.hostOnly === undefined || dep.hostOnly === null) || dep.hostOnly.includes(host),
    )

    const bareDeps = applicable.filter(([, dep]) => !dep.requiresEnv)
    const activatedDeps = applicable.filter(([, dep]) => dep.requiresEnv)

    const bareResults = await Promise.all(
      bareDeps.map(async ([name, dep]) =>
        await this._checkDependency(name, dep, process.env as Record<string, string>, 'bare'),
      ),
    )

    let activatedResults: DependencyStatus[] = []
    if (activatedDeps.length > 0) {
      const resolved = await this.resolveEnvironment()
      if (!resolved.activationSucceeded) {
        activatedResults = activatedDeps.map(([name, dep]) => ({
          name,
          expected: dep.version,
          found: null,
          healthy: false,
          tier: 'activated' as const,
          message: `Environment activation failed: ${(resolved.activationErrors ?? []).join(', ')}`,
        }))
      } else {
        activatedResults = await Promise.all(
          activatedDeps.map(async ([name, dep]) =>
            await this._checkDependency(name, dep, resolved.activated, 'activated'),
          ),
        )
      }
    }

    return [...bareResults, ...activatedResults]
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  private readonly _checkDependency = async (
    name: string,
    dep: Dependency,
    env: Record<string, string>,
    tier: 'bare' | 'activated',
  ): Promise<DependencyStatus> => {
    const versionCommand = dep.versionCommand
    if (versionCommand === undefined || versionCommand === null || versionCommand === '') {
      return {
        name,
        expected: dep.version,
        found: null,
        healthy: dep.optional ?? false,
        tier,
        message: 'No version command declared',
      }
    }

    try {
      const result = await execa('bash', ['-c', versionCommand], { env, reject: false })
      const stdout = typeof result.stdout === 'string' ? result.stdout : ''
      const stderr = typeof result.stderr === 'string' ? result.stderr : ''
      const output = stdout + stderr
      const versionPattern = dep.versionPattern
      const match = versionPattern !== undefined && versionPattern !== null ? output.match(new RegExp(versionPattern)) : null
      const found = match?.[1] ?? null
      const healthy =
        found !== null && found !== undefined && satisfies(found, dep.version, { loose: true })
      return { name, expected: dep.version, found, healthy, tier }
    } catch {
      return {
        name,
        expected: dep.version,
        found: null,
        healthy: false,
        tier,
        message: `Command failed: ${versionCommand}`,
      }
    }
  }
}
