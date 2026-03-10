import { z } from 'zod'

export type HostPlatform = 'darwin' | 'linux' | 'win32'
export type LifecycleOperation = 'setup' | 'update' | 'teardown'

const DependencySchema = z.object({
  type: z.enum(['sdk', 'toolchain', 'build-tool', 'runtime', 'system-package', 'archive']),
  version: z.string(),
  optional: z.boolean().default(false),
  requiresEnv: z.boolean().default(false),
  hostOnly: z.array(z.enum(['darwin', 'linux', 'win32'])).optional(),
  versionCommand: z.string().optional(),
  versionPattern: z.string().optional(),
  installHint: z.object({
    darwin: z.string().optional(),
    linux: z.string().optional(),
    win32: z.string().optional(),
  }).optional(),
  source: z.string().url().optional(),
})

const HostSupportSchema = z.object({
  darwin: z.boolean().default(false),
  linux: z.boolean().default(false),
  win32: z.boolean().default(false),
})

const EnvVarSchema = z.object({
  description: z.string().optional(),
  required: z.boolean().default(true),
  defaultPath: z.string().optional(),
})

export const PlatformManifestSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  displayName: z.string(),
  description: z.string(),
  sdkVendor: z.string().optional(),
  homepage: z.string().url().optional(),
  moddableTarget: z.string().optional(),
  dependencies: z.record(z.string(), DependencySchema),
  capabilities: z.object({
    setup: HostSupportSchema,
    update: HostSupportSchema,
    teardown: HostSupportSchema,
  }),
  env: z.record(z.string(), EnvVarSchema).optional(),
  activation: z.object({
    scripts: z.array(z.string()),
  }).optional(),
  postSetupNotes: z.string().optional(),
})

export type PlatformManifest = z.infer<typeof PlatformManifestSchema>
export type Dependency = z.infer<typeof DependencySchema>

export interface ResolvedEnvironment {
  static: Record<string, string>
  activated: Record<string, string>
  activationSucceeded: boolean
  activationErrors?: string[]
}

export interface DependencyStatus {
  name: string
  expected: string
  found: string | null
  healthy: boolean
  tier: 'bare' | 'activated'
  message?: string
}

export interface PlatformTarget {
  readonly manifest: PlatformManifest
  supports(op: LifecycleOperation, host: HostPlatform): boolean
  resolveEnvironment(overrides?: Record<string, string>): Promise<ResolvedEnvironment>
  checkDependencies(): Promise<DependencyStatus[]>
}
