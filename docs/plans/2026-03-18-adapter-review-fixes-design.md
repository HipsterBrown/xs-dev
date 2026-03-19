# Adapter Review Fixes Design

**Date:** 2026-03-18
**Branch:** feature/cli-rearchitecture
**Status:** Approved

## Goal

Address all critical and important issues identified in the post-implementation code review of the TargetAdapter refactor, plus the most impactful minor issues. Fixes span three themes: functional regressions, dead interface wiring, and the env-var side-channel smell.

## Architecture

### Theme 1: AdapterContext version field (replaces XS_DEV_* env-var bridge)

`AdapterContext` gains an optional `version` field. The moddable adapter is the only current consumer; all other adapters ignore it.

```ts
export interface AdapterContext {
  platform: 'mac' | 'lin' | 'win'
  arch: 'x64' | 'arm64'
  version?: string  // adapter-specific; format is adapter-defined
}
```

**Moddable version encoding** (prefix + optional `@<url>` suffix):

| `ctx.version` | release | branch | sourceRepo |
|---|---|---|---|
| `undefined` | `'latest'` | — | default |
| `release-<tag>` | `<tag>` | — | default |
| `branch-<name>` | — | `<name>` | default |
| `release-<tag>@<url>` | `<tag>` | — | `<url>` |
| `branch-<name>@<url>` | — | `<name>` | `<url>` |

The `@` separator splits on the **first** `@` only. HTTPS URLs (the only supported format in xs-dev) do not contain `@`, so this is unambiguous. SSH-style git URLs are not supported.

`setup.ts` and `update.ts` build the version string from CLI flags and spread it into the base context:

```ts
function buildVersionString(
  release: string | undefined,
  branch: string | undefined,
  sourceRepo: string | undefined,
): string | undefined {
  const prefix = branch !== undefined ? `branch-${branch}` : `release-${release ?? 'latest'}`
  return sourceRepo !== undefined ? `${prefix}@${sourceRepo}` : prefix
}

const ctx = { ...getAdapterContext(), version: buildVersionString(release, branch, sourceRepo) }
```

The `XS_DEV_RELEASE`, `XS_DEV_BRANCH`, `XS_DEV_SOURCE_REPO` environment variables and the `try/finally` cleanup blocks in `setup.ts`/`update.ts` are deleted entirely.

`moddable/index.ts` replaces its `process.env.XS_DEV_*` reads with a `parseModdableVersion(ctx.version)` helper that returns `{ release, branch, sourceRepo }`.

### Theme 2: Wire getActivationScript in build/index.ts

A new exported function in `src/toolbox/system/exec.ts`:

```ts
export async function sourceScript(scriptPath: string): Promise<Result<void>> {
  return await updateProcessEnv(`source ${scriptPath}`)
}
```

`updateProcessEnv` is unchanged and is Windows-aware (no-op on Windows). `sourceScript` inherits that behavior.

`build/index.ts` calls it in the adapter dispatch block, between `getEnvVars` and `verify`:

```ts
Object.assign(process.env, adapter.getEnvVars(ctx))
const script = adapter.getActivationScript?.(ctx)
if (script !== undefined && script !== null) {
  await sourceScript(script)
}
const verifyResult = await adapter.verify(ctx)
```

This fixes ESP-IDF Python venv activation for ESP32 builds and Zephyr venv activation for Zephyr builds.

### Theme 3: Targeted bug fixes

| Issue | File | Fix |
|---|---|---|
| Moddable dir not removed at teardown | `moddable/mac.ts`, `moddable/lin.ts` | Add `rmSync(INSTALL_PATH, { recursive: true, force: true })` to `teardownMac`/`teardownLinux` |
| nrf52 verify fails on Windows | `nrf52.ts` | `verify()` accepts `NRF_SDK_DIR` OR `NRF52_SDK_PATH`; `getEnvVars` returns `NRF_SDK_DIR` on non-Windows, `NRF52_SDK_PATH` on Windows |
| nrf52 ARCH_ALIAS undefined lookup | `nrf52.ts` | Guard after key construction: yield `step:fail` for unsupported `platform/arch` combos |
| wasm `getEnvVars` clobbers env | `wasm.ts` | Remove `EMSDK_NODE` and `EMSDK_PYTHON` from `getEnvVars` return |
| scan missing platform filter | `scan/index.ts` | Add `.filter(a => a.platforms.includes(ctx.platform))` |
| update ignores sourceRepo on mac/linux | `moddable/mac.ts`, `moddable/lin.ts` | `updateMac`/`updateLinux` read `sourceRepo` from parsed `ctx.version` (same helper as install) |
| Dead `import()` fallback | `setup.ts`, `update.ts` | Replace with `yield { type: 'step:fail', message: \`No adapter registered for device: ${target}\` }` |
| pico `getEnvVars` missing `PICO_GCC_ROOT` | `pico.ts` | Add `PICO_GCC_ROOT` to `getEnvVars` return |
| Registry tests incomplete | `registry.test.ts` | Add positive-case tests for `getAdapter` and `resolveAdapterForTarget` prefix matching |

## Components

### Files to create/modify

**Modified:**
- `src/lib/adapter.ts` — add `version?: string` to `AdapterContext`
- `src/toolbox/system/exec.ts` — export `sourceScript(path)`
- `src/toolbox/build/index.ts` — wire `sourceScript` + `getActivationScript`
- `src/toolbox/scan/index.ts` — add platform filter
- `src/commands/setup.ts` — build version string, spread into ctx, delete XS_DEV_* bridge
- `src/commands/update.ts` — same as setup.ts
- `src/toolbox/adapters/moddable/index.ts` — replace env reads with `parseModdableVersion(ctx.version)`
- `src/toolbox/adapters/moddable/mac.ts` — fix teardownMac, fix updateMac sourceRepo
- `src/toolbox/adapters/moddable/lin.ts` — fix teardownLinux, fix updateLinux sourceRepo
- `src/toolbox/adapters/nrf52.ts` — fix verify, fix getEnvVars, add ARCH_ALIAS guard
- `src/toolbox/adapters/wasm.ts` — remove EMSDK_NODE/EMSDK_PYTHON from getEnvVars
- `src/toolbox/adapters/pico.ts` — add PICO_GCC_ROOT to getEnvVars
- `tests/toolbox/adapters/registry.test.ts` — add positive-case tests

## Error Handling

- `sourceScript` follows the existing `Result<void>` pattern; callers should handle failure gracefully (log warning, continue — a missing activation script is not always fatal)
- `parseModdableVersion` with unrecognized prefix falls back to treating the whole string as a release tag (safe default)
- ARCH_ALIAS guard yields `step:fail` and returns early (consistent with existing adapter error pattern)

## Testing

Each change has a corresponding test update:
- `AdapterContext.version` — moddable adapter tests pass `ctx.version` variants through `parseModdableVersion`
- `sourceScript` — unit test in `exec.test.ts` or covered via integration
- nrf52 verify — update test to cover Windows path (`NRF52_SDK_PATH`)
- nrf52 ARCH_ALIAS guard — test unsupported combo yields `step:fail`
- wasm `getEnvVars` — update test to assert `EMSDK_NODE`/`EMSDK_PYTHON` absent from return
- pico `getEnvVars` — update test to assert `PICO_GCC_ROOT` present
- registry — add positive-case tests
