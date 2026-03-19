import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

describe('nrf52Toolchain.getEnvVars', () => {
  it('returns NRF_ROOT and NRF_SDK_DIR', async () => {
    const { nrf52Toolchain } = await import('../../../src/toolbox/toolchains/nrf52.js')
    const result = nrf52Toolchain.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('NRF_ROOT' in result)
    assert.ok('NRF_SDK_DIR' in result)
  })
})

describe('nrf52Toolchain.verify', () => {
  let savedRoot: string | undefined, savedSdk: string | undefined
  beforeEach(() => { savedRoot = process.env.NRF_ROOT; savedSdk = process.env.NRF_SDK_DIR })
  afterEach(() => {
    if (savedRoot !== undefined) process.env.NRF_ROOT = savedRoot; else delete process.env.NRF_ROOT
    if (savedSdk !== undefined) process.env.NRF_SDK_DIR = savedSdk; else delete process.env.NRF_SDK_DIR
  })

  it('returns ok: false when NRF_ROOT is not set', async () => {
    delete process.env.NRF_ROOT
    delete process.env.NRF_SDK_DIR
    const { nrf52Toolchain } = await import('../../../src/toolbox/toolchains/nrf52.js')
    const result = await nrf52Toolchain.verify({ platform: 'mac', arch: 'arm64' })
    assert.equal(result.ok, false)
  })
})

describe('nrf52Toolchain metadata', () => {
  it('has name "nrf52"', async () => {
    const { nrf52Toolchain } = await import('../../../src/toolbox/toolchains/nrf52.js')
    assert.equal(nrf52Toolchain.name, 'nrf52')
  })
})

describe('nrf52Toolchain.getEnvVars platform differences', () => {
  it('returns NRF_SDK_DIR on mac', async () => {
    const { nrf52Toolchain } = await import('../../../src/toolbox/toolchains/nrf52.js')
    const result = nrf52Toolchain.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('NRF_SDK_DIR' in result)
    assert.ok(!('NRF52_SDK_PATH' in result))
  })

  it('returns NRF52_SDK_PATH on win', async () => {
    const { nrf52Toolchain } = await import('../../../src/toolbox/toolchains/nrf52.js')
    const result = nrf52Toolchain.getEnvVars({ platform: 'win', arch: 'x64' })
    assert.ok('NRF52_SDK_PATH' in result)
    assert.ok(!('NRF_SDK_DIR' in result))
  })
})
