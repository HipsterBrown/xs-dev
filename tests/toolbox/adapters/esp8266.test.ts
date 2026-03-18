import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

describe('esp8266Adapter.getEnvVars', () => {
  it('returns ESP_BASE', async () => {
    const { esp8266Adapter } = await import('../../../src/toolbox/adapters/esp8266.js')
    const result = esp8266Adapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('ESP_BASE' in result)
  })
})

describe('esp8266Adapter.verify', () => {
  let saved: string | undefined
  beforeEach(() => { saved = process.env.ESP_BASE })
  afterEach(() => {
    if (saved !== undefined) process.env.ESP_BASE = saved
    else delete process.env.ESP_BASE
  })

  it('returns ok: false when ESP_BASE is not set', async () => {
    delete process.env.ESP_BASE
    const { esp8266Adapter } = await import('../../../src/toolbox/adapters/esp8266.js')
    const result = await esp8266Adapter.verify({ platform: 'mac', arch: 'arm64' })
    assert.equal(result.ok, false)
    assert.ok(result.missing !== undefined && result.missing.length > 0)
  })
})

describe('esp8266Adapter metadata', () => {
  it('has name "esp8266"', async () => {
    const { esp8266Adapter } = await import('../../../src/toolbox/adapters/esp8266.js')
    assert.equal(esp8266Adapter.name, 'esp8266')
  })
})
