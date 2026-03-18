import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

describe('zephyrAdapter.getEnvVars', () => {
  it('returns ZEPHYR_BASE', async () => {
    const { zephyrAdapter } = await import('../../../src/toolbox/adapters/zephyr.js')
    const result = zephyrAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('ZEPHYR_BASE' in result)
  })
})

describe('zephyrAdapter.verify', () => {
  let saved: string | undefined
  beforeEach(() => { saved = process.env.ZEPHYR_BASE })
  afterEach(() => {
    if (saved !== undefined) process.env.ZEPHYR_BASE = saved
    else delete process.env.ZEPHYR_BASE
  })

  it('returns ok: false when ZEPHYR_BASE is not set', async () => {
    delete process.env.ZEPHYR_BASE
    const { zephyrAdapter } = await import('../../../src/toolbox/adapters/zephyr.js')
    const result = await zephyrAdapter.verify({ platform: 'mac', arch: 'arm64' })
    assert.equal(result.ok, false)
  })
})

describe('zephyrAdapter metadata', () => {
  it('has name "zephyr"', async () => {
    const { zephyrAdapter } = await import('../../../src/toolbox/adapters/zephyr.js')
    assert.equal(zephyrAdapter.name, 'zephyr')
  })

  it('has getActivationScript', async () => {
    const { zephyrAdapter } = await import('../../../src/toolbox/adapters/zephyr.js')
    assert.ok(typeof zephyrAdapter.getActivationScript === 'function')
  })
})
