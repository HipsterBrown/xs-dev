import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('createNonInteractivePrompter', () => {
  const prompter = createNonInteractivePrompter()

  it('confirm returns defaultValue when provided', async () => {
    assert.equal(await prompter.confirm('Continue?', true), true)
    assert.equal(await prompter.confirm('Continue?', false), false)
  })

  it('confirm returns true when no defaultValue provided', async () => {
    assert.equal(await prompter.confirm('Continue?'), true)
  })

  it('select returns the first choice value', async () => {
    const choices = [
      { label: 'Option A', value: 'a' },
      { label: 'Option B', value: 'b' },
    ]
    assert.equal(await prompter.select('Pick one', choices), 'a')
  })
})
