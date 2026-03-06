import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/update/windows', async () => {
  const { default: updateWindows } = await import('#src/toolbox/update/windows.js')

  it('yields warning event', async () => {
    const prompter = createNonInteractivePrompter()
    const events = await Array.fromAsync(updateWindows({}, prompter))
    assert.ok(events.length > 0)
    assert.strictEqual(events[0].type, 'warning')
    assert.match(events[0].message, /Windows update is not currently supported/)
  })
})
