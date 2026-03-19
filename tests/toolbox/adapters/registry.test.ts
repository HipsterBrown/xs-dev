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

  it('resolves exact name "esp32" to esp32 adapter', () => {
    const adapter = resolveAdapterForTarget('esp32')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp32')
  })

  it('resolves "esp32/moddable_two" by prefix to esp32 adapter', () => {
    const adapter = resolveAdapterForTarget('esp32/moddable_two')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp32')
  })

  it('resolves "pico" to pico adapter', () => {
    const adapter = resolveAdapterForTarget('pico')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'pico')
  })

  it('resolves "wasm" to wasm adapter', () => {
    const adapter = resolveAdapterForTarget('wasm')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'wasm')
  })

  it('resolves "nrf52" to nrf52 adapter', () => {
    const adapter = resolveAdapterForTarget('nrf52')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'nrf52')
  })

  it('resolves "esp8266" to esp8266 adapter', () => {
    const adapter = resolveAdapterForTarget('esp8266')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp8266')
  })

  it('resolves "zephyr" to zephyr adapter', () => {
    const adapter = resolveAdapterForTarget('zephyr')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'zephyr')
  })
})

describe('getAdapter', () => {
  it('returns undefined for unknown name', () => {
    assert.equal(getAdapter('unknown'), undefined)
  })

  it('returns moddable adapter by name', () => {
    const adapter = getAdapter('moddable')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'moddable')
  })

  it('returns esp32 adapter by name', () => {
    const adapter = getAdapter('esp32')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp32')
  })

  it('returns pico adapter by name', () => {
    const adapter = getAdapter('pico')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'pico')
  })

  it('returns wasm adapter by name', () => {
    const adapter = getAdapter('wasm')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'wasm')
  })

  it('returns nrf52 adapter by name', () => {
    const adapter = getAdapter('nrf52')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'nrf52')
  })

  it('returns esp8266 adapter by name', () => {
    const adapter = getAdapter('esp8266')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp8266')
  })

  it('returns zephyr adapter by name', () => {
    const adapter = getAdapter('zephyr')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'zephyr')
  })
})
