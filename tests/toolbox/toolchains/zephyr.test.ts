import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

describe('zephyrToolchain.getEnvVars', () => {
  it('returns ZEPHYR_BASE', async () => {
    const { zephyrToolchain } = await import('../../../src/toolbox/toolchains/zephyr.js')
    const result = zephyrToolchain.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('ZEPHYR_BASE' in result)
  })
})

describe('zephyrToolchain.verify', () => {
  let saved: string | undefined
  beforeEach(() => { saved = process.env.ZEPHYR_BASE })
  afterEach(() => {
    if (saved !== undefined) process.env.ZEPHYR_BASE = saved
    else delete process.env.ZEPHYR_BASE
  })

  it('returns ok: false when ZEPHYR_BASE is not set', async () => {
    delete process.env.ZEPHYR_BASE
    const { zephyrToolchain } = await import('../../../src/toolbox/toolchains/zephyr.js')
    const result = await zephyrToolchain.verify({ platform: 'mac', arch: 'arm64' })
    assert.equal(result.ok, false)
  })
})

describe('zephyrToolchain metadata', () => {
  it('has name "zephyr"', async () => {
    const { zephyrToolchain } = await import('../../../src/toolbox/toolchains/zephyr.js')
    assert.equal(zephyrToolchain.name, 'zephyr')
  })

  it('has getActivationScript', async () => {
    const { zephyrToolchain } = await import('../../../src/toolbox/toolchains/zephyr.js')
    assert.ok(typeof zephyrToolchain.getActivationScript === 'function')
  })
})
