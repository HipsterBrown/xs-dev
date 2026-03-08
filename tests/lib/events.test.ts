import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { OperationEvent } from '#src/lib/events.js'

describe('OperationEvent', () => {
  it('step:start events carry a message', () => {
    const event: OperationEvent = { type: 'step:start', message: 'Cloning repo' }
    assert.equal(event.type, 'step:start')
    assert.equal(event.message, 'Cloning repo')
  })

  it('step:fail events carry a message', () => {
    const event: OperationEvent = { type: 'step:fail', message: 'Build failed' }
    assert.equal(event.type, 'step:fail')
  })
})
