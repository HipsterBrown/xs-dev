import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/adapters/moddable/windows (update)', async () => {
  const { updateWindows } = await import('#src/toolbox/adapters/moddable/windows.js')

  it('yields warning event', async () => {
    const prompter = createNonInteractivePrompter()
    const ctx = { platform: 'win' as const, arch: 'x64' as const }
    const events = await Array.fromAsync(updateWindows(ctx, prompter))
    assert.ok(events.length > 0)
    assert.strictEqual(events[0].type, 'warning')
    assert.match(events[0].message ?? '', /Windows update is not currently supported/)
  })
})
