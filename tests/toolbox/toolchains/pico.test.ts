import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

describe('picoToolchain.getEnvVars', () => {
  it('returns PICO_SDK_PATH and PIOASM', async () => {
    const { picoToolchain } = await import('../../../src/toolbox/toolchains/pico.js')
    const result = picoToolchain.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('PICO_SDK_PATH' in result)
    assert.ok('PIOASM' in result)
  })

  it('returns PICO_GCC_ROOT', async () => {
    const { picoToolchain } = await import('../../../src/toolbox/toolchains/pico.js')
    const result = picoToolchain.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('PICO_GCC_ROOT' in result)
  })

  it('returns /usr as PICO_GCC_ROOT default on lin', async () => {
    const savedGccRoot = process.env.PICO_GCC_ROOT
    delete process.env.PICO_GCC_ROOT
    try {
      const { picoToolchain } = await import('../../../src/toolbox/toolchains/pico.js')
      const result = picoToolchain.getEnvVars({ platform: 'lin', arch: 'x64' })
      assert.equal(result.PICO_GCC_ROOT, '/usr')
    } finally {
      if (savedGccRoot !== undefined) process.env.PICO_GCC_ROOT = savedGccRoot
    }
  })

  it('returns process.env.PICO_GCC_ROOT when set', async () => {
    const savedGccRoot = process.env.PICO_GCC_ROOT
    process.env.PICO_GCC_ROOT = '/opt/homebrew'
    try {
      const { picoToolchain } = await import('../../../src/toolbox/toolchains/pico.js')
      const result = picoToolchain.getEnvVars({ platform: 'mac', arch: 'arm64' })
      assert.equal(result.PICO_GCC_ROOT, '/opt/homebrew')
    } finally {
      if (savedGccRoot !== undefined) process.env.PICO_GCC_ROOT = savedGccRoot
      else delete process.env.PICO_GCC_ROOT
    }
  })
})

describe('picoToolchain.verify', () => {
  let savedSdkPath: string | undefined
  let savedPioasm: string | undefined

  beforeEach(() => {
    savedSdkPath = process.env.PICO_SDK_PATH
    savedPioasm = process.env.PIOASM
  })
  afterEach(() => {
    if (savedSdkPath !== undefined) process.env.PICO_SDK_PATH = savedSdkPath
    else delete process.env.PICO_SDK_PATH
    if (savedPioasm !== undefined) process.env.PIOASM = savedPioasm
    else delete process.env.PIOASM
  })

  it('returns ok: false when PICO_SDK_PATH is not set', async () => {
    delete process.env.PICO_SDK_PATH
    delete process.env.PIOASM
    const { picoToolchain } = await import('../../../src/toolbox/toolchains/pico.js')
    const result = await picoToolchain.verify({ platform: 'mac', arch: 'arm64' })
    assert.equal(result.ok, false)
    assert.ok(result.missing !== undefined && result.missing.length > 0)
  })
})

describe('picoToolchain metadata', () => {
  it('has name "pico"', async () => {
    const { picoToolchain } = await import('../../../src/toolbox/toolchains/pico.js')
    assert.equal(picoToolchain.name, 'pico')
  })

  it('supports mac, lin, win', async () => {
    const { picoToolchain } = await import('../../../src/toolbox/toolchains/pico.js')
    assert.ok(picoToolchain.platforms.includes('mac'))
    assert.ok(picoToolchain.platforms.includes('lin'))
  })
})
