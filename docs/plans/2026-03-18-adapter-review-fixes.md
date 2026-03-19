# Adapter Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 15 issues identified in the post-implementation code review of the TargetAdapter refactor: the XS_DEV_* env-var bridge, dead `getActivationScript` wiring, functional regressions in teardown and update, and scattered per-adapter bugs.

**Architecture:** Three themes. Theme 1 replaces the XS_DEV_* side-channel with a `version?: string` field on `AdapterContext`, encoded as `release-<tag>[@<url>]` or `branch-<name>[@<url>]`. Theme 2 wires the dead `getActivationScript` interface into `build/index.ts` via a new `sourceScript()` export in `exec.ts`. Theme 3 fixes isolated per-adapter bugs: teardown regressions, nrf52 Windows verify, wasm env clobbering, missing scan filter, and dead fallback code.

**Tech Stack:** TypeScript (NodeNext), Node.js native test runner (`tsx --test`), `node:fs`, `execa`

---

### Task 1: Add `version?: string` to `AdapterContext`

**Files:**
- Modify: `src/lib/adapter.ts`

**Step 1: Write the failing test**

The interface change is purely additive and TypeScript will enforce it. No test needed — the compile step verifies it. Skip to Step 2.

**Step 2: Apply the change**

In `src/lib/adapter.ts`, change:
```ts
export interface AdapterContext {
  platform: HostPlatform
  arch: 'x64' | 'arm64'
}
```
to:
```ts
export interface AdapterContext {
  platform: HostPlatform
  arch: 'x64' | 'arm64'
  version?: string  // adapter-specific; format is adapter-defined
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd /Users/nick.hehr/src/xs-dev && pnpm build
```
Expected: 0 errors.

**Step 4: Commit**

```bash
git add src/lib/adapter.ts
git commit -m "feat: add version field to AdapterContext interface"
```

---

### Task 2: Add `parseModdableVersion` helper + update moddable `install`

**Files:**
- Modify: `src/toolbox/adapters/moddable/index.ts`
- Modify: `tests/toolbox/adapters/moddable.test.ts`

The helper decodes `ctx.version` into `{ release, branch, sourceRepo }`. The moddable `install()` method uses this instead of reading `process.env.XS_DEV_*`.

**Step 1: Write the failing test**

In `tests/toolbox/adapters/moddable.test.ts`, add before the closing:

```ts
describe('parseModdableVersion', () => {
  it('is exported from moddable/index', async () => {
    const mod = await import('../../../src/toolbox/adapters/moddable/index.js')
    assert.equal(typeof (mod as Record<string, unknown>).parseModdableVersion, 'function')
  })

  it('undefined version → release latest, no branch, no sourceRepo', async () => {
    const { parseModdableVersion } = await import('../../../src/toolbox/adapters/moddable/index.js') as { parseModdableVersion: (v: string | undefined) => { release: string | undefined, branch: string | undefined, sourceRepo: string | undefined } }
    const result = parseModdableVersion(undefined)
    assert.equal(result.release, 'latest')
    assert.equal(result.branch, undefined)
    assert.equal(result.sourceRepo, undefined)
  })

  it('release-1.2.3 → release 1.2.3', async () => {
    const { parseModdableVersion } = await import('../../../src/toolbox/adapters/moddable/index.js') as { parseModdableVersion: (v: string | undefined) => { release: string | undefined, branch: string | undefined, sourceRepo: string | undefined } }
    const result = parseModdableVersion('release-1.2.3')
    assert.equal(result.release, '1.2.3')
    assert.equal(result.branch, undefined)
    assert.equal(result.sourceRepo, undefined)
  })

  it('branch-main → branch main', async () => {
    const { parseModdableVersion } = await import('../../../src/toolbox/adapters/moddable/index.js') as { parseModdableVersion: (v: string | undefined) => { release: string | undefined, branch: string | undefined, sourceRepo: string | undefined } }
    const result = parseModdableVersion('branch-main')
    assert.equal(result.release, undefined)
    assert.equal(result.branch, 'main')
    assert.equal(result.sourceRepo, undefined)
  })

  it('release-2.0.0@https://github.com/fork/moddable → release + sourceRepo', async () => {
    const { parseModdableVersion } = await import('../../../src/toolbox/adapters/moddable/index.js') as { parseModdableVersion: (v: string | undefined) => { release: string | undefined, branch: string | undefined, sourceRepo: string | undefined } }
    const result = parseModdableVersion('release-2.0.0@https://github.com/fork/moddable')
    assert.equal(result.release, '2.0.0')
    assert.equal(result.branch, undefined)
    assert.equal(result.sourceRepo, 'https://github.com/fork/moddable')
  })

  it('branch-dev@https://github.com/fork/moddable → branch + sourceRepo', async () => {
    const { parseModdableVersion } = await import('../../../src/toolbox/adapters/moddable/index.js') as { parseModdableVersion: (v: string | undefined) => { release: string | undefined, branch: string | undefined, sourceRepo: string | undefined } }
    const result = parseModdableVersion('branch-dev@https://github.com/fork/moddable')
    assert.equal(result.release, undefined)
    assert.equal(result.branch, 'dev')
    assert.equal(result.sourceRepo, 'https://github.com/fork/moddable')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test tests/toolbox/adapters/moddable.test.ts
```
Expected: FAIL — `parseModdableVersion is not a function` or similar.

**Step 3: Implement `parseModdableVersion` and update `install`**

In `src/toolbox/adapters/moddable/index.ts`, add the helper **before** `moddableAdapter`:

```ts
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
```

Then update `moddableAdapter.install()` — replace the `args` block:

```ts
async *install(ctx: AdapterContext, prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
  const { release, branch, sourceRepo } = parseModdableVersion(ctx.version)
  const args: PlatformSetupArgs = {
    release,
    sourceRepo: sourceRepo ?? 'https://github.com/Moddable-OpenSource/moddable',
    branch,
  }
  if (ctx.platform === 'mac') yield* installMac(args, prompter)
  else if (ctx.platform === 'lin') yield* installLinux(args, prompter)
  else yield* installWindows(args, prompter)
},
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test tests/toolbox/adapters/moddable.test.ts
```
Expected: All tests PASS.

**Step 5: Verify TypeScript compiles**

```bash
pnpm build
```
Expected: 0 errors.

**Step 6: Commit**

```bash
git add src/toolbox/adapters/moddable/index.ts tests/toolbox/adapters/moddable.test.ts
git commit -m "feat: add parseModdableVersion helper, use ctx.version in moddable install"
```

---

### Task 3: `buildVersionString` in `setup.ts` + `update.ts`, delete XS_DEV_* bridge

**Files:**
- Modify: `src/commands/setup.ts`
- Modify: `src/commands/update.ts`

`setup.ts` currently sets `process.env.XS_DEV_RELEASE`, `XS_DEV_BRANCH`, `XS_DEV_SOURCE_REPO` and cleans them up in a `try/finally`. Replace this with a `buildVersionString` helper that encodes the flags into `ctx.version`.

**Step 1: Apply the change to `setup.ts`**

Add `buildVersionString` at the top of the command function body (or as a module-level function), and update the moddable path:

Replace the moddable adapter block (lines 98–117 in setup.ts):
```ts
if (platformDevices.includes(target)) {
  const adapter = getAdapter('moddable')
  if (adapter === undefined) {
    console.warn('Moddable adapter not found')
    process.exit(1)
  }
  // Pass branch/release/sourceRepo to adapter via env vars
  process.env.XS_DEV_RELEASE = release  // always set (has 'latest' default)
  if (sourceRepo !== undefined) process.env.XS_DEV_SOURCE_REPO = sourceRepo  // always set (has default)
  if (branch !== undefined) process.env.XS_DEV_BRANCH = branch
  const ctx = getAdapterContext()
  try {
    for await (const event of adapter.install(ctx, prompter)) {
      handleEvent(event, spinner)
    }
  } finally {
    delete process.env.XS_DEV_BRANCH
    delete process.env.XS_DEV_RELEASE
    delete process.env.XS_DEV_SOURCE_REPO
  }
```

with:

```ts
if (platformDevices.includes(target)) {
  const adapter = getAdapter('moddable')
  if (adapter === undefined) {
    console.warn('Moddable adapter not found')
    process.exit(1)
  }
  const version = buildVersionString(release, branch, sourceRepo)
  const ctx = { ...getAdapterContext(), version }
  for await (const event of adapter.install(ctx, prompter)) {
    handleEvent(event, spinner)
  }
```

Add `buildVersionString` as a module-level helper in `setup.ts` (before the `buildCommand` call):

```ts
function buildVersionString(
  release: string | undefined,
  branch: string | undefined,
  sourceRepo: string | undefined,
): string | undefined {
  const prefix = branch !== undefined ? `branch-${branch}` : `release-${release ?? 'latest'}`
  return sourceRepo !== undefined ? `${prefix}@${sourceRepo}` : prefix
}
```

**Step 2: Apply the same change to `update.ts`**

Replace the moddable adapter block in update.ts (the `process.env.XS_DEV_*` + `try/finally` block):

```ts
if (platformDevices.includes(resolvedTarget)) {
  const adapter = getAdapter('moddable')
  if (adapter === undefined) {
    console.warn('Moddable adapter not found')
    process.exit(1)
  }
  process.env.XS_DEV_RELEASE = release  // always set (has 'latest' default)
  if (branch !== undefined) process.env.XS_DEV_BRANCH = branch
  const ctx = getAdapterContext()
  const spinner = ora()
  try {
    for await (const event of adapter.update(ctx, prompter)) {
      handleEvent(event, spinner)
    }
  } finally {
    delete process.env.XS_DEV_BRANCH
    delete process.env.XS_DEV_RELEASE
  }
```

with:

```ts
if (platformDevices.includes(resolvedTarget)) {
  const adapter = getAdapter('moddable')
  if (adapter === undefined) {
    console.warn('Moddable adapter not found')
    process.exit(1)
  }
  const version = buildVersionString(release, branch, undefined)
  const ctx = { ...getAdapterContext(), version }
  const spinner = ora()
  for await (const event of adapter.update(ctx, prompter)) {
    handleEvent(event, spinner)
  }
```

Add `buildVersionString` as a module-level helper in `update.ts` (same function as in setup.ts):

```ts
function buildVersionString(
  release: string | undefined,
  branch: string | undefined,
  sourceRepo: string | undefined,
): string | undefined {
  const prefix = branch !== undefined ? `branch-${branch}` : `release-${release ?? 'latest'}`
  return sourceRepo !== undefined ? `${prefix}@${sourceRepo}` : prefix
}
```

**Step 3: Verify TypeScript compiles**

```bash
pnpm build
```
Expected: 0 errors.

**Step 4: Run all tests**

```bash
pnpm test tests/toolbox/adapters/moddable.test.ts
```
Expected: All pass.

**Step 5: Commit**

```bash
git add src/commands/setup.ts src/commands/update.ts
git commit -m "feat: replace XS_DEV_* env-var bridge with ctx.version in setup/update"
```

---

### Task 4: Fix `updateMac` + `updateLinux` to use `parseModdableVersion(ctx.version)`

**Files:**
- Modify: `src/toolbox/adapters/moddable/mac.ts`
- Modify: `src/toolbox/adapters/moddable/lin.ts`

Both functions currently read `process.env.XS_DEV_BRANCH` / `process.env.XS_DEV_RELEASE`. Replace with `parseModdableVersion(ctx.version)`. Also fixes the mac issue where `updateMac` hardcodes `MODDABLE_REPO` instead of using the `sourceRepo` from the context.

**Step 1: Fix `updateMac` in `mac.ts`**

Change the signature from `_ctx: AdapterContext` to `ctx: AdapterContext`.

Replace lines 233–235 in `mac.ts`:
```ts
  // TODO(Task 7): wire branch/release from command args
  const branch: string | undefined = process.env.XS_DEV_BRANCH
  const release: string | undefined = process.env.XS_DEV_RELEASE
```

with:
```ts
  const { release, branch, sourceRepo } = parseModdableVersion(ctx.version)
```

Add the import of `parseModdableVersion` at the top of `mac.ts`:
```ts
import { parseModdableVersion } from '../index.js'
```

Then find the hardcoded `MODDABLE_REPO` in the clone command inside `updateMac` (~line 300):
```ts
await execaCommand(
  `git clone ${MODDABLE_REPO} ${INSTALL_PATH} --depth 1 --branch ${remoteRelease.tag_name} --single-branch`,
)
```

Replace with:
```ts
const cloneRepo = sourceRepo ?? MODDABLE_REPO
await execaCommand(
  `git clone ${cloneRepo} ${INSTALL_PATH} --depth 1 --branch ${remoteRelease.tag_name} --single-branch`,
)
```

**Step 2: Fix `updateLinux` in `lin.ts`**

Change the signature from `_ctx: AdapterContext` to `ctx: AdapterContext`.

Replace (near line 275):
```ts
  // TODO(Task 7): wire branch/release from command args
  const branch: string | undefined = process.env.XS_DEV_BRANCH
  const release: string | undefined = process.env.XS_DEV_RELEASE
```

with:
```ts
  const { release, branch, sourceRepo } = parseModdableVersion(ctx.version)
```

Add the import at the top of `lin.ts`:
```ts
import { parseModdableVersion } from '../index.js'
```

Then find the hardcoded clone call inside `updateLinux` (where it removes and re-clones for a release update). It likely uses `MODDABLE_REPO` — replace with `sourceRepo ?? MODDABLE_REPO` the same way as mac.ts.

**Step 3: Verify TypeScript compiles**

```bash
pnpm build
```
Expected: 0 errors.

**Step 4: Commit**

```bash
git add src/toolbox/adapters/moddable/mac.ts src/toolbox/adapters/moddable/lin.ts
git commit -m "fix: updateMac/updateLinux read branch/release/sourceRepo from ctx.version"
```

---

### Task 5: Export `sourceScript` from `exec.ts` + wire `getActivationScript` in `build/index.ts`

**Files:**
- Modify: `src/toolbox/system/exec.ts`
- Modify: `src/toolbox/build/index.ts`

`sourceScript(path)` wraps the private `updateProcessEnv` and sources an arbitrary script path. `build/index.ts` calls it between `getEnvVars` and `verify`.

**Step 1: Add `sourceScript` to `exec.ts`**

In `src/toolbox/system/exec.ts`, add after `sourceIdfPythonEnv`:

```ts
/**
 * Source an arbitrary shell script and update process.env with the result.
 * No-op on Windows (same behavior as updateProcessEnv).
 */
export async function sourceScript(scriptPath: string): Promise<Result<void>> {
  return await updateProcessEnv(`source ${scriptPath}`)
}
```

**Step 2: Wire `getActivationScript` in `build/index.ts`**

Add `sourceScript` to the import from `exec.ts`:
```ts
import { sourceEnvironment, which, sourceScript } from '../system/exec.js'
```

Find the adapter dispatch block in `build/index.ts` (~line 159–173):
```ts
      if (adapter !== undefined) {
        // Apply env vars from the adapter so build tools are on PATH
        Object.assign(process.env, adapter.getEnvVars(ctx))

        // Verify the adapter is set up
        const verifyResult = await adapter.verify(ctx)
```

Replace with:
```ts
      if (adapter !== undefined) {
        // Apply env vars from the adapter so build tools are on PATH
        Object.assign(process.env, adapter.getEnvVars(ctx))

        // Source activation script if adapter provides one (e.g. ESP-IDF, Zephyr)
        const script = adapter.getActivationScript?.(ctx)
        if (script !== undefined && script !== null) {
          await sourceScript(script)
        }

        // Verify the adapter is set up
        const verifyResult = await adapter.verify(ctx)
```

**Step 3: Verify TypeScript compiles**

```bash
pnpm build
```
Expected: 0 errors.

**Step 4: Run existing build tests**

```bash
pnpm test tests/toolbox/build/envCheck.test.ts
```
Expected: All pass.

**Step 5: Commit**

```bash
git add src/toolbox/system/exec.ts src/toolbox/build/index.ts
git commit -m "feat: add sourceScript(), wire getActivationScript in build/index.ts"
```

---

### Task 6: Fix `teardownMac` and `teardownLinux` — remove `INSTALL_PATH`

**Files:**
- Modify: `src/toolbox/adapters/moddable/mac.ts`
- Modify: `src/toolbox/adapters/moddable/lin.ts`

`teardownMac` removes the ejectfix backup and the xsbug.app symlink, but never removes the Moddable SDK directory at `INSTALL_PATH`. Same for `teardownLinux`.

**Step 1: Fix `teardownMac` in `mac.ts`**

In `teardownMac`, after the existing `remove` calls, add:
```ts
  remove(INSTALL_PATH)
```

The full teardownMac after fix:
```ts
export async function* teardownMac(
  _ctx: AdapterContext,
): AsyncGenerator<OperationEvent, void, undefined> {
  yield { type: 'step:start', message: 'Removing macOS-specific Moddable SDK files' }

  const remove = (path: string): void => {
    rmSync(path, { recursive: true, force: true })
  }

  const NC_PREFS_BACKUP = join(INSTALL_DIR, 'ejectfix', 'com.apple.ncprefs.plist')
  if (existsSync(NC_PREFS_BACKUP) && statSync(NC_PREFS_BACKUP).isFile()) {
    cpSync(
      NC_PREFS_BACKUP,
      join(homedir(), 'Library', 'Preferences', 'com.apple.ncprefs.plist'),
    )
  }
  remove(join(INSTALL_DIR, 'ejectfix'))
  remove('/Applications/xsbug.app')
  remove(INSTALL_PATH)

  yield { type: 'step:done' }
}
```

**Step 2: Fix `teardownLinux` in `lin.ts`**

The current `teardownLinux` is a stub that does nothing. Add `rmSync` for `INSTALL_PATH`. First check what's imported — `INSTALL_PATH` and `rmSync` must be in scope.

At the top of `lin.ts`, verify `INSTALL_PATH` is imported (it is, from constants). Add `rmSync` to the `node:fs` import if it's not there.

Replace the stub `teardownLinux`:
```ts
export async function* teardownLinux(
  _ctx: AdapterContext,
): AsyncGenerator<OperationEvent, void, undefined> {
  // Linux has no OS-specific teardown (the Darwin block in teardown/index.ts is mac-only)
  yield { type: 'step:start', message: 'Linux teardown complete (no OS-specific steps)' }
  yield { type: 'step:done' }
}
```

with:
```ts
export async function* teardownLinux(
  _ctx: AdapterContext,
): AsyncGenerator<OperationEvent, void, undefined> {
  yield { type: 'step:start', message: 'Removing Moddable SDK directory' }
  rmSync(INSTALL_PATH, { recursive: true, force: true })
  yield { type: 'step:done' }
}
```

Verify `rmSync` is imported in `lin.ts`. Current imports from `node:fs` in lin.ts: look at line 1. Add `rmSync` to the destructured import if missing.

**Step 3: Verify TypeScript compiles**

```bash
pnpm build
```
Expected: 0 errors.

**Step 4: Commit**

```bash
git add src/toolbox/adapters/moddable/mac.ts src/toolbox/adapters/moddable/lin.ts
git commit -m "fix: teardownMac/teardownLinux now remove INSTALL_PATH directory"
```

---

### Task 7: Fix `nrf52` — verify, `getEnvVars`, and `ARCH_ALIAS` guard

**Files:**
- Modify: `src/toolbox/adapters/nrf52.ts`
- Modify: `tests/toolbox/adapters/nrf52.test.ts`

Three bugs:
1. `verify()` checks only `NRF_SDK_DIR` but Windows install sets `NRF52_SDK_PATH`
2. `getEnvVars` always returns `NRF_SDK_DIR` but should return `NRF52_SDK_PATH` on Windows
3. `ARCH_ALIAS[archKey]` can be `undefined` for unsupported platform/arch combos

**Step 1: Write failing tests**

In `tests/toolbox/adapters/nrf52.test.ts`, add:

```ts
describe('nrf52Adapter.verify on Windows', () => {
  let savedRoot: string | undefined
  let savedSdkDir: string | undefined
  let savedSdkPath: string | undefined

  beforeEach(() => {
    savedRoot = process.env.NRF_ROOT
    savedSdkDir = process.env.NRF_SDK_DIR
    savedSdkPath = process.env.NRF52_SDK_PATH
  })
  afterEach(() => {
    if (savedRoot !== undefined) process.env.NRF_ROOT = savedRoot; else delete process.env.NRF_ROOT
    if (savedSdkDir !== undefined) process.env.NRF_SDK_DIR = savedSdkDir; else delete process.env.NRF_SDK_DIR
    if (savedSdkPath !== undefined) process.env.NRF52_SDK_PATH = savedSdkPath; else delete process.env.NRF52_SDK_PATH
  })

  it('returns ok: false when only NRF52_SDK_PATH is set but NRF_ROOT missing (windows)', async () => {
    delete process.env.NRF_ROOT
    process.env.NRF52_SDK_PATH = '/some/path'
    const { nrf52Adapter } = await import('../../../src/toolbox/adapters/nrf52.js')
    const result = await nrf52Adapter.verify({ platform: 'win', arch: 'x64' })
    assert.equal(result.ok, false)
  })
})

describe('nrf52Adapter.getEnvVars platform differences', () => {
  it('returns NRF_SDK_DIR on mac', async () => {
    const { nrf52Adapter } = await import('../../../src/toolbox/adapters/nrf52.js')
    const result = nrf52Adapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('NRF_SDK_DIR' in result)
    assert.ok(!('NRF52_SDK_PATH' in result))
  })

  it('returns NRF52_SDK_PATH on win', async () => {
    const { nrf52Adapter } = await import('../../../src/toolbox/adapters/nrf52.js')
    const result = nrf52Adapter.getEnvVars({ platform: 'win', arch: 'x64' })
    assert.ok('NRF52_SDK_PATH' in result)
    assert.ok(!('NRF_SDK_DIR' in result))
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test tests/toolbox/adapters/nrf52.test.ts
```
Expected: FAIL — Windows getEnvVars test fails.

**Step 3: Fix `verify` in `nrf52.ts`**

Change signature from `async verify(_ctx: AdapterContext)` to `async verify(ctx: AdapterContext)`.

Replace the `NRF_SDK_DIR` check block:
```ts
    if (process.env.NRF_SDK_DIR === undefined || process.env.NRF_SDK_DIR === '') {
      missing.push('NRF_SDK_DIR env var not set')
    } else if (!existsSync(process.env.NRF_SDK_DIR)) {
      missing.push(`NRF_SDK_DIR path does not exist: ${process.env.NRF_SDK_DIR}`)
    }
```

with:
```ts
    // Windows install sets NRF52_SDK_PATH; other platforms set NRF_SDK_DIR
    const sdkDir = ctx.platform === 'win' ? process.env.NRF52_SDK_PATH : process.env.NRF_SDK_DIR
    const sdkEnvName = ctx.platform === 'win' ? 'NRF52_SDK_PATH' : 'NRF_SDK_DIR'
    if (sdkDir === undefined || sdkDir === '') {
      missing.push(`${sdkEnvName} env var not set`)
    } else if (!existsSync(sdkDir)) {
      missing.push(`${sdkEnvName} path does not exist: ${sdkDir}`)
    }
```

**Step 4: Fix `getEnvVars` in `nrf52.ts`**

Change signature from `getEnvVars(_ctx: AdapterContext)` to `getEnvVars(ctx: AdapterContext)`.

Replace the return:
```ts
    return {
      NRF_ROOT: NRF52_DIR,
      NRF_SDK_DIR: resolve(NRF52_DIR, NRF5_SDK),
    }
```

with:
```ts
    const sdkPath = resolve(NRF52_DIR, NRF5_SDK)
    return ctx.platform === 'win'
      ? { NRF_ROOT: NRF52_DIR, NRF52_SDK_PATH: sdkPath }
      : { NRF_ROOT: NRF52_DIR, NRF_SDK_DIR: sdkPath }
```

**Step 5: Add `ARCH_ALIAS` guard in `install`**

In `nrf52.ts` `install()`, find:
```ts
    const archKey = `${ctx.platform}_${ctx.arch}`
    const TOOLCHAIN = `arm-gnu-toolchain-12.2.rel1-${ARCH_ALIAS[archKey]}-arm-none-eabi`
```

Replace with:
```ts
    const archKey = `${ctx.platform}_${ctx.arch}`
    const archAlias = ARCH_ALIAS[archKey]
    if (archAlias === undefined) {
      yield { type: 'step:fail', message: `Unsupported platform/arch combination for nrf52: ${archKey}` }
      return
    }
    const TOOLCHAIN = `arm-gnu-toolchain-12.2.rel1-${archAlias}-arm-none-eabi`
```

**Step 6: Run tests to verify they pass**

```bash
pnpm test tests/toolbox/adapters/nrf52.test.ts
```
Expected: All pass.

**Step 7: Verify TypeScript compiles**

```bash
pnpm build
```
Expected: 0 errors.

**Step 8: Commit**

```bash
git add src/toolbox/adapters/nrf52.ts tests/toolbox/adapters/nrf52.test.ts
git commit -m "fix: nrf52 verify/getEnvVars Windows path, ARCH_ALIAS undefined guard"
```

---

### Task 8: Fix `wasm` `getEnvVars` — remove `EMSDK_NODE` and `EMSDK_PYTHON`

**Files:**
- Modify: `src/toolbox/adapters/wasm.ts`
- Modify: `tests/toolbox/adapters/wasm.test.ts`

`getEnvVars` currently returns `EMSDK_NODE: process.env.EMSDK_NODE ?? ''` and `EMSDK_PYTHON: process.env.EMSDK_PYTHON ?? ''`. On an uninstalled system, this overwrites env vars with empty strings, breaking `verify()`. These vars come from sourcing `emsdk_env.sh` and should not be set by `getEnvVars`.

**Step 1: Update the failing test**

In `tests/toolbox/adapters/wasm.test.ts`, update the existing `EMSDK_NODE` and `EMSDK_PYTHON` tests to expect them to be **absent**:

Replace:
```ts
  it('returns EMSDK_NODE', async () => {
    const { wasmAdapter } = await import('../../../src/toolbox/adapters/wasm.js')
    const result = wasmAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('EMSDK_NODE' in result)
  })

  it('returns EMSDK_PYTHON', async () => {
    const { wasmAdapter } = await import('../../../src/toolbox/adapters/wasm.js')
    const result = wasmAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('EMSDK_PYTHON' in result)
  })
```

with:
```ts
  it('does NOT include EMSDK_NODE (comes from emsdk_env.sh, not getEnvVars)', async () => {
    const { wasmAdapter } = await import('../../../src/toolbox/adapters/wasm.js')
    const result = wasmAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok(!('EMSDK_NODE' in result))
  })

  it('does NOT include EMSDK_PYTHON (comes from emsdk_env.sh, not getEnvVars)', async () => {
    const { wasmAdapter } = await import('../../../src/toolbox/adapters/wasm.js')
    const result = wasmAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok(!('EMSDK_PYTHON' in result))
  })
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test tests/toolbox/adapters/wasm.test.ts
```
Expected: FAIL — EMSDK_NODE/EMSDK_PYTHON still present.

**Step 3: Fix `getEnvVars` in `wasm.ts`**

Find `getEnvVars` in `wasm.ts`:
```ts
  getEnvVars(_ctx: AdapterContext): Record<string, string> {
    const WASM_DIR = resolve(INSTALL_DIR, 'wasm')
    const EMSDK_PATH = resolve(WASM_DIR, 'emsdk')
    const BINARYEN_PATH = resolve(WASM_DIR, 'binaryen')
    return {
      EMSDK: EMSDK_PATH,
      EMSDK_NODE: process.env.EMSDK_NODE ?? '',
      EMSDK_PYTHON: process.env.EMSDK_PYTHON ?? '',
      PATH: `${resolve(BINARYEN_PATH, 'bin')}:${process.env.PATH ?? ''}`,
    }
  },
```

Replace with:
```ts
  getEnvVars(_ctx: AdapterContext): Record<string, string> {
    const WASM_DIR = resolve(INSTALL_DIR, 'wasm')
    const EMSDK_PATH = resolve(WASM_DIR, 'emsdk')
    const BINARYEN_PATH = resolve(WASM_DIR, 'binaryen')
    return {
      EMSDK: EMSDK_PATH,
      PATH: `${resolve(BINARYEN_PATH, 'bin')}:${process.env.PATH ?? ''}`,
    }
  },
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test tests/toolbox/adapters/wasm.test.ts
```
Expected: All pass.

**Step 5: Verify TypeScript compiles**

```bash
pnpm build
```
Expected: 0 errors.

**Step 6: Commit**

```bash
git add src/toolbox/adapters/wasm.ts tests/toolbox/adapters/wasm.test.ts
git commit -m "fix: remove EMSDK_NODE/EMSDK_PYTHON from wasm getEnvVars"
```

---

### Task 9: Add platform filter to `scan/index.ts`

**Files:**
- Modify: `src/toolbox/scan/index.ts`

`scan` currently calls `adapter.getEnvVars(ctx)` for all adapters including those for other platforms (e.g. Windows-only adapters running on mac). Add a platform filter.

**Step 1: Apply the fix**

In `src/toolbox/scan/index.ts`, find:
```ts
  for (const adapter of Object.values(adapters)) {
    Object.assign(process.env, adapter.getEnvVars(ctx))
  }
```

Replace with:
```ts
  for (const adapter of Object.values(adapters).filter(a => a.platforms.includes(ctx.platform))) {
    Object.assign(process.env, adapter.getEnvVars(ctx))
  }
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm build
```
Expected: 0 errors.

**Step 3: Commit**

```bash
git add src/toolbox/scan/index.ts
git commit -m "fix: filter adapters by platform in scan/index.ts"
```

---

### Task 10: Add `PICO_GCC_ROOT` to `pico` `getEnvVars`

**Files:**
- Modify: `src/toolbox/adapters/pico.ts`
- Modify: `tests/toolbox/adapters/pico.test.ts`

`install()` correctly sets `PICO_GCC_ROOT` (brew prefix on mac, `/usr` on linux), but `getEnvVars()` omits it.

**Step 1: Write the failing test**

In `tests/toolbox/adapters/pico.test.ts`, add in the `picoAdapter.getEnvVars` describe block:

```ts
  it('returns PICO_GCC_ROOT', async () => {
    const { picoAdapter } = await import('../../../src/toolbox/adapters/pico.js')
    const result = picoAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('PICO_GCC_ROOT' in result)
  })
```

**Step 2: Run test to verify it fails**

```bash
pnpm test tests/toolbox/adapters/pico.test.ts
```
Expected: FAIL — `PICO_GCC_ROOT` not in result.

**Step 3: Fix `getEnvVars` in `pico.ts`**

The value of `PICO_GCC_ROOT` depends on the process environment (set by `install()`). Use `process.env.PICO_GCC_ROOT` as the runtime value, falling back to the platform default:

```ts
  getEnvVars(ctx: AdapterContext): Record<string, string> {
    const defaultGccRoot = ctx.platform === 'lin' ? '/usr' : ''
    return {
      PICO_SDK_PATH: resolve(INSTALL_DIR, 'pico', 'pico-sdk'),
      PIOASM: resolve(INSTALL_DIR, 'pico', 'pico-sdk', 'build', 'pioasm', 'pioasm'),
      PICO_GCC_ROOT: process.env.PICO_GCC_ROOT ?? defaultGccRoot,
    }
  },
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test tests/toolbox/adapters/pico.test.ts
```
Expected: All pass.

**Step 5: Verify TypeScript compiles**

```bash
pnpm build
```
Expected: 0 errors.

**Step 6: Commit**

```bash
git add src/toolbox/adapters/pico.ts tests/toolbox/adapters/pico.test.ts
git commit -m "fix: add PICO_GCC_ROOT to pico getEnvVars"
```

---

### Task 11: Replace dead `import()` fallback in `setup.ts` and `update.ts`

**Files:**
- Modify: `src/commands/setup.ts`
- Modify: `src/commands/update.ts`

After the TargetAdapter refactor, all devices have adapters in the registry. The dynamic `import()` fallback for unregistered devices is dead code. Replace with a proper error event.

**Step 1: Fix `setup.ts`**

Find the dead fallback (~line 126):
```ts
      } else {
        const { default: setup } = await import(`../toolbox/setup/${target}.js`)
        for await (const event of setup({ branch, release }, prompter) as AsyncGenerator<OperationEvent>) {
          handleEvent(event, spinner)
        }
      }
```

Replace with:
```ts
      } else {
        handleEvent({ type: 'step:fail', message: `No adapter registered for device: ${target}` }, spinner)
      }
```

**Step 2: Fix `update.ts`**

Find the dead fallback (~line 66):
```ts
      } else {
        const { default: update } = await import(`../toolbox/update/${resolvedTarget}.js`)
        for await (const event of update({ branch, release }, prompter) as AsyncGenerator<OperationEvent>) {
          handleEvent(event, spinner)
        }
      }
```

Replace with:
```ts
      } else {
        handleEvent({ type: 'step:fail', message: `No adapter registered for device: ${resolvedTarget}` }, spinner)
      }
```

Also remove the now-unused `OperationEvent` import from `update.ts` if it's only used in that block. Check: `import type { OperationEvent } from '../lib/events.js'` — remove this line if `OperationEvent` has no other uses.

Do the same for `setup.ts` — check if `OperationEvent` is still used elsewhere.

**Step 3: Verify TypeScript compiles**

```bash
pnpm build
```
Expected: 0 errors (no unused import warnings since it's a type import, but clean up anyway).

**Step 4: Commit**

```bash
git add src/commands/setup.ts src/commands/update.ts
git commit -m "fix: replace dead dynamic import() fallback with step:fail error event"
```

---

### Task 12: Add positive-case tests to `registry.test.ts`

**Files:**
- Modify: `tests/toolbox/adapters/registry.test.ts`

The file only tests negative cases. Add positive cases for `getAdapter` and `resolveAdapterForTarget` prefix matching.

**Step 1: Add positive-case tests**

Replace the contents of `tests/toolbox/adapters/registry.test.ts` with:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveAdapterForTarget, getAdapter } from '../../../src/toolbox/adapters/registry.js'

describe('resolveAdapterForTarget', () => {
  it('returns undefined for unknown platform', () => {
    assert.equal(resolveAdapterForTarget('unknown/target'), undefined)
  })

  it('returns undefined for empty string', () => {
    assert.equal(resolveAdapterForTarget(''), undefined)
  })

  it('resolves exact name "esp32" to esp32 adapter', () => {
    const adapter = resolveAdapterForTarget('esp32')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp32')
  })

  it('resolves "esp32/moddable_two" by prefix to esp32 adapter', () => {
    const adapter = resolveAdapterForTarget('esp32/moddable_two')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp32')
  })

  it('resolves "pico" to pico adapter', () => {
    const adapter = resolveAdapterForTarget('pico')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'pico')
  })

  it('resolves "wasm" to wasm adapter', () => {
    const adapter = resolveAdapterForTarget('wasm')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'wasm')
  })

  it('resolves "nrf52" to nrf52 adapter', () => {
    const adapter = resolveAdapterForTarget('nrf52')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'nrf52')
  })
})

describe('getAdapter', () => {
  it('returns undefined for unknown name', () => {
    assert.equal(getAdapter('unknown'), undefined)
  })

  it('returns moddable adapter by name', () => {
    const adapter = getAdapter('moddable')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'moddable')
  })

  it('returns esp32 adapter by name', () => {
    const adapter = getAdapter('esp32')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp32')
  })

  it('returns pico adapter by name', () => {
    const adapter = getAdapter('pico')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'pico')
  })

  it('returns wasm adapter by name', () => {
    const adapter = getAdapter('wasm')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'wasm')
  })

  it('returns nrf52 adapter by name', () => {
    const adapter = getAdapter('nrf52')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'nrf52')
  })
})
```

**Step 2: Run tests to verify they pass**

```bash
pnpm test tests/toolbox/adapters/registry.test.ts
```
Expected: All pass.

**Step 3: Commit**

```bash
git add tests/toolbox/adapters/registry.test.ts
git commit -m "test: add positive-case tests for getAdapter and resolveAdapterForTarget"
```

---

## Final Verification

Run the full test suite to confirm nothing is broken:

```bash
pnpm build && pnpm test tests/toolbox/adapters/moddable.test.ts && pnpm test tests/toolbox/adapters/nrf52.test.ts && pnpm test tests/toolbox/adapters/wasm.test.ts && pnpm test tests/toolbox/adapters/pico.test.ts && pnpm test tests/toolbox/adapters/registry.test.ts && pnpm test tests/toolbox/build/envCheck.test.ts
```

Expected: All test files pass, 0 TypeScript errors.
