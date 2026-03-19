import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

describe('esp8266Toolchain.getEnvVars', () => {
  it('returns ESP_BASE', async () => {
    const { esp8266Toolchain } = await import('../../../src/toolbox/toolchains/esp8266.js')
    const result = esp8266Toolchain.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('ESP_BASE' in result)
  })
})

describe('esp8266Toolchain.verify', () => {
  let saved: string | undefined
  beforeEach(() => { saved = process.env.ESP_BASE })
  afterEach(() => {
    if (saved !== undefined) process.env.ESP_BASE = saved
    else delete process.env.ESP_BASE
  })

  it('returns ok: false when ESP_BASE is not set', async () => {
    delete process.env.ESP_BASE
    const { esp8266Toolchain } = await import('../../../src/toolbox/toolchains/esp8266.js')
    const result = await esp8266Toolchain.verify({ platform: 'mac', arch: 'arm64' })
    assert.equal(result.ok, false)
    assert.ok(result.missing !== undefined && result.missing.length > 0)
  })
})

describe('esp8266Toolchain metadata', () => {
  it('has name "esp8266"', async () => {
    const { esp8266Toolchain } = await import('../../../src/toolbox/toolchains/esp8266.js')
    assert.equal(esp8266Toolchain.name, 'esp8266')
  })
})
