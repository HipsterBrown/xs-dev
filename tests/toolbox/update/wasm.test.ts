import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'
import { wasmAdapter } from '#src/toolbox/adapters/wasm.js'

describe('wasmAdapter.update', () => {
  it('yields warning that wasm update is not supported', async () => {
    const prompter = createNonInteractivePrompter()
    const ctx = { platform: 'mac' as const, arch: 'arm64' as const }
    const events = await Array.fromAsync(wasmAdapter.update(ctx, prompter))
    assert.ok(events.length > 0)
    assert.equal(events[0].type, 'warning')
    assert.match(String(events[0].message), /Wasm update is not currently supported/)
  })
})
