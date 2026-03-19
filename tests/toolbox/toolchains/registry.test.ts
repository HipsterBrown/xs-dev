import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveToolchain, getToolchain } from '../../../src/toolbox/toolchains/registry.js'

describe('resolveToolchain', () => {
  it('returns undefined for unknown platform', () => {
    assert.equal(resolveToolchain('unknown/target'), undefined)
  })

  it('returns undefined for empty string', () => {
    assert.equal(resolveToolchain(''), undefined)
  })

  it('resolves exact name "esp32" to esp32 adapter', () => {
    const adapter = resolveToolchain('esp32')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp32')
  })

  it('resolves "esp32/moddable_two" by prefix to esp32 adapter', () => {
    const adapter = resolveToolchain('esp32/moddable_two')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp32')
  })

  it('resolves "pico" to pico adapter', () => {
    const adapter = resolveToolchain('pico')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'pico')
  })

  it('resolves "wasm" to wasm adapter', () => {
    const adapter = resolveToolchain('wasm')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'wasm')
  })

  it('resolves "nrf52" to nrf52 adapter', () => {
    const adapter = resolveToolchain('nrf52')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'nrf52')
  })

  it('resolves "esp8266" to esp8266 adapter', () => {
    const adapter = resolveToolchain('esp8266')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp8266')
  })

  it('resolves "zephyr" to zephyr adapter', () => {
    const adapter = resolveToolchain('zephyr')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'zephyr')
  })
})

describe('getToolchain', () => {
  it('returns undefined for unknown name', () => {
    assert.equal(getToolchain('unknown'), undefined)
  })

  it('returns moddable adapter by name', () => {
    const adapter = getToolchain('moddable')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'moddable')
  })

  it('returns esp32 adapter by name', () => {
    const adapter = getToolchain('esp32')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp32')
  })

  it('returns pico adapter by name', () => {
    const adapter = getToolchain('pico')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'pico')
  })

  it('returns wasm adapter by name', () => {
    const adapter = getToolchain('wasm')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'wasm')
  })

  it('returns nrf52 adapter by name', () => {
    const adapter = getToolchain('nrf52')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'nrf52')
  })

  it('returns esp8266 adapter by name', () => {
    const adapter = getToolchain('esp8266')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'esp8266')
  })

  it('returns zephyr adapter by name', () => {
    const adapter = getToolchain('zephyr')
    assert.ok(adapter !== undefined)
    assert.equal(adapter.name, 'zephyr')
  })
})
