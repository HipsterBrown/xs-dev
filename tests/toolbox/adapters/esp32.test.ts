import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

describe('esp32Adapter.getEnvVars', () => {
  it('returns IDF_PATH', async () => {
    const { esp32Adapter } = await import('../../../src/toolbox/adapters/esp32/index.js')
    const result = esp32Adapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('IDF_PATH' in result)
  })
})

describe('esp32Adapter.getActivationScript', () => {
  beforeEach(() => { process.env.IDF_PATH = '/test/esp-idf' })
  afterEach(() => { delete process.env.IDF_PATH })

  it('returns export.sh path when IDF_PATH is set', async () => {
    const { esp32Adapter } = await import('../../../src/toolbox/adapters/esp32/index.js')
    const result = esp32Adapter.getActivationScript?.({ platform: 'mac', arch: 'arm64' })
    assert.ok(result !== null && result !== undefined && result.endsWith('export.sh'))
  })

  it('returns null when IDF_PATH is not set', async () => {
    delete process.env.IDF_PATH
    const { esp32Adapter } = await import('../../../src/toolbox/adapters/esp32/index.js')
    const result = esp32Adapter.getActivationScript?.({ platform: 'mac', arch: 'arm64' })
    assert.equal(result, null)
  })
})

describe('esp32Adapter.verify', () => {
  let savedEnv: string | undefined

  beforeEach(() => { savedEnv = process.env.IDF_PATH })
  afterEach(() => {
    if (savedEnv !== undefined) process.env.IDF_PATH = savedEnv
    else delete process.env.IDF_PATH
  })

  it('returns ok: false when IDF_PATH is not set', async () => {
    delete process.env.IDF_PATH
    const { esp32Adapter } = await import('../../../src/toolbox/adapters/esp32/index.js')
    const result = await esp32Adapter.verify({ platform: 'mac', arch: 'arm64' })
    assert.equal(result.ok, false)
    assert.ok(result.missing !== undefined && result.missing.length > 0)
  })
})

describe('esp32Adapter metadata', () => {
  it('has correct name', async () => {
    const { esp32Adapter } = await import('../../../src/toolbox/adapters/esp32/index.js')
    assert.equal(esp32Adapter.name, 'esp32')
  })

  it('includes mac, lin, win platforms', async () => {
    const { esp32Adapter } = await import('../../../src/toolbox/adapters/esp32/index.js')
    assert.ok(esp32Adapter.platforms.includes('mac'))
    assert.ok(esp32Adapter.platforms.includes('lin'))
    assert.ok(esp32Adapter.platforms.includes('win'))
  })
})
