import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveToolchain } from '../../../src/toolbox/toolchains/registry.js'

describe('resolveToolchain', () => {
  it('resolves esp32 target to esp32 adapter', () => {
    const adapter = resolveToolchain('esp32')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp32')
  })

  it('resolves esp32/moddable_two target to esp32 adapter', () => {
    const adapter = resolveToolchain('esp32/moddable_two')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp32')
  })

  it('resolves pico target to pico adapter', () => {
    const adapter = resolveToolchain('pico')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'pico')
  })

  it('resolves wasm target to wasm adapter', () => {
    const adapter = resolveToolchain('wasm')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'wasm')
  })

  it('returns undefined for unknown target', () => {
    const adapter = resolveToolchain('unknown_target')
    assert.equal(adapter, undefined)
  })

  it('returns undefined for simulator targets', () => {
    // simulator/ targets are excluded from adapter dispatch in build()
    // This test just verifies the registry has no 'simulator' adapter
    const adapter = resolveToolchain('simulator/linux')
    assert.equal(adapter, undefined)
  })
})
