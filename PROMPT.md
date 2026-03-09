# xs-dev Post-Review Fixes (Round 2)

Work through the tasks below in order. After completing each task, verify with the stated check before moving to the next. Commit completed tasks individually with descriptive messages.

When ALL tasks are checked off and `pnpm lint && pnpm tsc --noEmit && pnpm test` all pass, output:
<promise>ROUND 2 FIXES COMPLETE</promise>

---

## Task 1: Fix `mcpack` availability check in build/index.ts [CRITICAL]

**Problem:** The original code checked both `which('mcpack') !== null` AND `package.json` exists before using mcpack. The new code only checks for `package.json`. If mcpack is not installed, the build will invoke it and crash with a confusing error.

**Fix:**

- [ ] Read `src/toolbox/build/index.ts` and find the `canUseMCPack` block (search for `canUseMCPack`)
- [ ] Import `which` from `'../system/exec'` at the top of the file (check if already imported — it may be; add only if missing)
- [ ] Change the `canUseMCPack` logic to require BOTH `which('mcpack') !== null` AND the `package.json` stat check:

  ```typescript
  let canUseMCPack = false
  if (which('mcpack') !== null) {
    try {
      await stat(resolve(projectPath, 'package.json'))
      canUseMCPack = true
    } catch {
      canUseMCPack = false
    }
  }
  ```

**Verify:** `pnpm lint && pnpm tsc --noEmit` pass. `pnpm xs-dev build --example helloworld --device mac` still works.

**Commit:** `fix(build): restore mcpack availability check with which() guard`

---

## Task 2: Fix `--list-devices` path in setup.ts to respect non-interactive mode [CRITICAL]

**Problem:** The `select` from `@inquirer/prompts` is imported directly and called unconditionally in the `--list-devices` branch. This bypasses the `prompter` abstraction and `isInteractive()` check. In CI (`CI=true`), running `xs-dev setup --list-devices` will hang waiting for terminal input.

**Fix:**

- [ ] Read `src/commands/setup.ts` around the `--list-devices` block
- [ ] The `prompter` is already created before this block using `isInteractive()`. Route the device selection through `prompter.select()` instead of the raw `select` from inquirer:

  ```typescript
  if (device === undefined && listDevices) {
    const choices = [
      'esp8266', 'esp32', 'pico', 'wasm', 'nrf52', 'zephyr',
      DEVICE_ALIAS[currentPlatform],
    ]
    const selectedDevice = await prompter.select(
      'Here are the available target devices:',
      choices.map((c) => ({ label: c, value: c })),
    )
    if (selectedDevice !== '' && selectedDevice !== undefined) {
      target = selectedDevice as Device
    } else {
      output.warn('Please select a target device to run')
      return
    }
  }
  ```

- [ ] Remove the `import { select } from '@inquirer/prompts'` line if it is now unused (grep to confirm — it may still be used elsewhere in setup.ts; check before removing)

**Verify:** `pnpm lint && pnpm tsc --noEmit` pass. `pnpm xs-dev setup --list-devices` still works interactively.

**Commit:** `fix(setup): route --list-devices through prompter to respect non-interactive mode`

---

## Task 3: Fix events.test.ts asserting non-existent `taskId` field [CRITICAL]

**Problem:** The test at `tests/lib/events.test.ts` assigns `taskId: 'esp32'` to an `OperationEvent` and asserts `event.taskId === 'esp32'`. But `taskId` was removed from the `OperationEvent` type when the `parallel` utility was deleted. The test currently passes at runtime (JS is duck-typed) but creates a false promise to library consumers and will fail TypeScript strict checks.

**Decision:** `taskId` was intentionally removed. Remove the test case — do not add `taskId` back.

- [ ] Read `tests/lib/events.test.ts`
- [ ] Delete the `it('step:start events may carry an optional taskId', ...)` test block entirely
- [ ] The remaining two tests (`step:start events carry a message` and `step:fail events carry a message`) should be kept

**Verify:** `pnpm test` passes with the test removed.

**Commit:** `test(events): remove taskId test assertion for removed field`

---

## Task 4: Fix `upsert` leading-newline bug when file does not exist [IMPORTANT]

**Problem:** In `src/toolbox/patching/upsert.ts`, when the target file does not exist, `contents` is `''`. The join `['', newLine].join('\n')` produces `'\n<line>'` — a leading newline at the top of the file. Every shell profile line added by xs-dev will start with a blank line.

**Fix:**

- [ ] Read `src/toolbox/patching/upsert.ts`
- [ ] Fix the write logic to avoid the leading newline:

  ```typescript
  export default async function upsert(filePath: string, newLine: string): Promise<void> {
    let contents = ''
    if (existsSync(filePath)) {
      contents = await readFile(filePath, 'utf8')
    }
    if (!contents.includes(newLine)) {
      const separator = contents.length > 0 ? '\n' : ''
      await writeFile(filePath, `${contents}${separator}${newLine}`, 'utf8')
    }
  }
  ```

**Verify:** `pnpm test` passes (there is a `tests/toolbox/patching/upsert.test.ts` — check it covers the empty-file case; if not, add a test for it).

**Commit:** `fix(upsert): avoid leading newline when target file does not exist`

---

## Task 5: Remove dead `interactive` field from `SetupArgs` [IMPORTANT]

**Problem:** `SetupArgs` in `src/toolbox/setup/types.ts` has an `interactive?: boolean` field that is no longer read by any setup module. All interactivity now goes through the `Prompter` argument. Keeping it misleads library consumers.

**Fix:**

- [ ] Grep for `\.interactive` or `interactive:` usage across `src/toolbox/setup/` to confirm no module reads it
- [ ] Remove `interactive?: boolean` from the `SetupArgs` interface in `src/toolbox/setup/types.ts`
- [ ] Grep for any call sites that pass `interactive:` inside a setup args object and remove those fields too

**Verify:** `pnpm lint && pnpm tsc --noEmit && pnpm test` all pass.

**Commit:** `refactor(types): remove unused interactive field from SetupArgs`

---

## Task 6: Add TTY guard to ANSI color output in output.ts [MINOR]

**Problem:** `src/lib/output.ts` emits raw ANSI escape codes unconditionally. When stdout/stderr is piped or redirected (e.g. `xs-dev build 2>&1 | tee log.txt`), the ANSI codes appear as literal characters in the output.

**Fix:**

- [ ] Read `src/lib/output.ts`
- [ ] Add a helper that strips ANSI when not connected to a TTY:

  ```typescript
  function colorize(code: string, message: string): string {
    if (!process.stdout.isTTY) return message
    return `${code}${message}${RESET}`
  }
  ```

  For stderr functions (`warn`, `error`), check `process.stderr.isTTY` instead.

- [ ] Update each exported function to use `colorize`:

  ```typescript
  export function info(message: string): void {
    process.stdout.write(colorize(CYAN, message) + '\n')
  }
  export function success(message: string): void {
    process.stdout.write(colorize(GREEN, message) + '\n')
  }
  export function warn(message: string): void {
    const prefix = process.stderr.isTTY ? `${YELLOW}Warning:${RESET} ` : 'Warning: '
    process.stderr.write(prefix + message + '\n')
  }
  export function error(message: string): void {
    const prefix = process.stderr.isTTY ? `${RED}Error:${RESET} ` : 'Error: '
    process.stderr.write(prefix + message + '\n')
  }
  ```

**Verify:** `pnpm lint && pnpm tsc --noEmit` pass. `pnpm xs-dev init test-project 2>&1 | cat` should show no ANSI codes; running directly in terminal should show color. Clean up `test-project` after.

**Commit:** `fix(output): strip ANSI codes when stdout/stderr is not a TTY`

---

## Verification

After all tasks:

```bash
pnpm lint && pnpm tsc --noEmit && pnpm test
```

All three must pass with zero errors.

<promise>ROUND 2 FIXES COMPLETE</promise>
