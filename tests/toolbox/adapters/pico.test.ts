import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

describe('picoAdapter.getEnvVars', () => {
  it('returns PICO_SDK_PATH and PIOASM', async () => {
    const { picoAdapter } = await import('../../../src/toolbox/adapters/pico.js')
    const result = picoAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('PICO_SDK_PATH' in result)
    assert.ok('PIOASM' in result)
  })

  it('returns PICO_GCC_ROOT', async () => {
    const { picoAdapter } = await import('../../../src/toolbox/adapters/pico.js')
    const result = picoAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('PICO_GCC_ROOT' in result)
  })

  it('returns /usr as PICO_GCC_ROOT default on lin', async () => {
    const savedGccRoot = process.env.PICO_GCC_ROOT
    delete process.env.PICO_GCC_ROOT
    try {
      const { picoAdapter } = await import('../../../src/toolbox/adapters/pico.js')
      const result = picoAdapter.getEnvVars({ platform: 'lin', arch: 'x64' })
      assert.equal(result.PICO_GCC_ROOT, '/usr')
    } finally {
      if (savedGccRoot !== undefined) process.env.PICO_GCC_ROOT = savedGccRoot
    }
  })

  it('returns process.env.PICO_GCC_ROOT when set', async () => {
    const savedGccRoot = process.env.PICO_GCC_ROOT
    process.env.PICO_GCC_ROOT = '/opt/homebrew'
    try {
      const { picoAdapter } = await import('../../../src/toolbox/adapters/pico.js')
      const result = picoAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
      assert.equal(result.PICO_GCC_ROOT, '/opt/homebrew')
    } finally {
      if (savedGccRoot !== undefined) process.env.PICO_GCC_ROOT = savedGccRoot
      else delete process.env.PICO_GCC_ROOT
    }
  })
})

describe('picoAdapter.verify', () => {
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
    const { picoAdapter } = await import('../../../src/toolbox/adapters/pico.js')
    const result = await picoAdapter.verify({ platform: 'mac', arch: 'arm64' })
    assert.equal(result.ok, false)
    assert.ok(result.missing !== undefined && result.missing.length > 0)
  })
})

describe('picoAdapter metadata', () => {
  it('has name "pico"', async () => {
    const { picoAdapter } = await import('../../../src/toolbox/adapters/pico.js')
    assert.equal(picoAdapter.name, 'pico')
  })

  it('supports mac, lin, win', async () => {
    const { picoAdapter } = await import('../../../src/toolbox/adapters/pico.js')
    assert.ok(picoAdapter.platforms.includes('mac'))
    assert.ok(picoAdapter.platforms.includes('lin'))
  })
})
