import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parallel } from '#src/lib/parallel.js'
import type { OperationEvent } from '#src/lib/events.js'

async function* makeGen(id: string, events: OperationEvent[]): AsyncGenerator<OperationEvent> {
  for (const event of events) {
    yield event
  }
}

describe('parallel', () => {
  it('merges events from multiple generators and tags with taskId', async () => {
    const gen = parallel([
      { id: 'a', generator: makeGen('a', [{ type: 'info', message: 'hello from a' }]) },
      { id: 'b', generator: makeGen('b', [{ type: 'info', message: 'hello from b' }]) },
    ])

    const events = await Array.fromAsync(gen)
    assert.equal(events.length, 2)
    assert.ok(events.some(e => e.taskId === 'a' && e.message === 'hello from a'))
    assert.ok(events.some(e => e.taskId === 'b' && e.message === 'hello from b'))
  })

  it('all events from all generators are yielded', async () => {
    const gen = parallel([
      { id: 'x', generator: makeGen('x', [
        { type: 'step:start', message: 'start' },
        { type: 'step:done' },
      ])},
    ])

    const events = await Array.fromAsync(gen)
    assert.equal(events.length, 2)
    assert.equal(events[0].type, 'step:start')
    assert.equal(events[1].type, 'step:done')
  })
})
