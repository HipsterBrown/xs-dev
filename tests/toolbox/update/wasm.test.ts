import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/update/wasm', async () => {
  const { default: updateWasm } = await import('#src/toolbox/update/wasm.js')

  it('yields warning event', async () => {
    const prompter = createNonInteractivePrompter()
    const events = await Array.fromAsync(updateWasm({}, prompter))
    assert.ok(events.length > 0)
    assert.strictEqual(events[0].type, 'warning')
    assert.match(events[0].message, /Wasm update is not currently supported/)
  })
})
