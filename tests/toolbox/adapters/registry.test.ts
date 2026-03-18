import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveAdapterForTarget, getAdapter } from '../../../src/toolbox/adapters/registry.js'

describe('resolveAdapterForTarget', () => {
  it('returns undefined for unknown platform', () => {
    assert.equal(resolveAdapterForTarget('unknown/target'), undefined)
  })

  it('returns undefined for empty string', () => {
    assert.equal(resolveAdapterForTarget(''), undefined)
  })
})

describe('getAdapter', () => {
  it('returns undefined for unknown name', () => {
    assert.equal(getAdapter('unknown'), undefined)
  })
})
