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

  it('resolves exact name "esp32" to esp32 toolchain', () => {
    const toolchain = resolveToolchain('esp32')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'esp32')
  })

  it('resolves "esp32/moddable_two" by prefix to esp32 toolchain', () => {
    const toolchain = resolveToolchain('esp32/moddable_two')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'esp32')
  })

  it('resolves "pico" to pico toolchain', () => {
    const toolchain = resolveToolchain('pico')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'pico')
  })

  it('resolves "wasm" to wasm toolchain', () => {
    const toolchain = resolveToolchain('wasm')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'wasm')
  })

  it('resolves "nrf52" to nrf52 toolchain', () => {
    const toolchain = resolveToolchain('nrf52')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'nrf52')
  })

  it('resolves "esp8266" to esp8266 toolchain', () => {
    const toolchain = resolveToolchain('esp8266')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'esp8266')
  })

  it('resolves "zephyr" to zephyr toolchain', () => {
    const toolchain = resolveToolchain('zephyr')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'zephyr')
  })
})

describe('getToolchain', () => {
  it('returns undefined for unknown name', () => {
    assert.equal(getToolchain('unknown'), undefined)
  })

  it('returns moddable toolchain by name', () => {
    const toolchain = getToolchain('moddable')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'moddable')
  })

  it('returns esp32 toolchain by name', () => {
    const toolchain = getToolchain('esp32')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'esp32')
  })

  it('returns pico toolchain by name', () => {
    const toolchain = getToolchain('pico')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'pico')
  })

  it('returns wasm toolchain by name', () => {
    const toolchain = getToolchain('wasm')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'wasm')
  })

  it('returns nrf52 toolchain by name', () => {
    const toolchain = getToolchain('nrf52')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'nrf52')
  })

  it('returns esp8266 toolchain by name', () => {
    const toolchain = getToolchain('esp8266')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'esp8266')
  })

  it('returns zephyr toolchain by name', () => {
    const toolchain = getToolchain('zephyr')
    assert.ok(toolchain !== undefined)
    assert.equal(toolchain.name, 'zephyr')
  })
})
