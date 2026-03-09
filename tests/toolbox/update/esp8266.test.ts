import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/update/esp8266', async () => {
  const { default: updateEsp8266 } = await import('#src/toolbox/update/esp8266.js')

  it('yields warning event', async () => {
    const prompter = createNonInteractivePrompter()
    const events = await Array.fromAsync(updateEsp8266({}, prompter))
    assert.ok(events.length > 0)
    assert.strictEqual(events[0].type, 'warning')
    assert.match(events[0].message, /ESP8266 update is not currently supported/)
  })
})
