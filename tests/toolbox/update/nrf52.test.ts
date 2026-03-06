import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/update/nrf52', async () => {
  const { default: updateNrf52 } = await import('#src/toolbox/update/nrf52.js')

  it('yields warning event', async () => {
    const prompter = createNonInteractivePrompter()
    const events = await Array.fromAsync(updateNrf52({}, prompter))
    assert.ok(events.length > 0)
    assert.strictEqual(events[0].type, 'warning')
    assert.match(events[0].message, /nRF52 update is not currently supported/)
  })
})
