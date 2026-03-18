import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

// On macOS/Linux, INSTALL_PATH is ~/.local/share/moddable
const INSTALL_DIR = resolve(homedir(), '.local', 'share')
const INSTALL_PATH = resolve(INSTALL_DIR, 'moddable')

describe('moddableAdapter.getEnvVars', () => {
  it('returns MODDABLE and PATH for mac', async () => {
    const { moddableAdapter } = await import('../../../src/toolbox/adapters/moddable/index.js')
    const result = moddableAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.equal(result.MODDABLE, INSTALL_PATH)
    assert.ok(result.PATH?.includes(resolve(INSTALL_PATH, 'build', 'bin', 'mac', 'release')))
  })

  it('returns MODDABLE and PATH for lin', async () => {
    const { moddableAdapter } = await import('../../../src/toolbox/adapters/moddable/index.js')
    const result = moddableAdapter.getEnvVars({ platform: 'lin', arch: 'x64' })
    assert.equal(result.MODDABLE, INSTALL_PATH)
    assert.ok(result.PATH?.includes(resolve(INSTALL_PATH, 'build', 'bin', 'lin', 'release')))
  })
})

describe('moddableAdapter.verify', () => {
  let originalModdable: string | undefined

  beforeEach(() => {
    originalModdable = process.env.MODDABLE
  })

  afterEach(() => {
    if (originalModdable === undefined) {
      delete process.env.MODDABLE
    } else {
      process.env.MODDABLE = originalModdable
    }
  })

  it('returns ok: false when MODDABLE is not set', async () => {
    delete process.env.MODDABLE
    const { moddableAdapter } = await import('../../../src/toolbox/adapters/moddable/index.js')
    const result = await moddableAdapter.verify({ platform: 'mac', arch: 'arm64' })
    assert.equal(result.ok, false)
    assert.ok((result.missing?.length ?? 0) > 0)
  })

  it('returns ok: false when MODDABLE path does not exist', async () => {
    process.env.MODDABLE = '/does/not/exist'
    const { moddableAdapter } = await import('../../../src/toolbox/adapters/moddable/index.js')
    const result = await moddableAdapter.verify({ platform: 'mac', arch: 'arm64' })
    assert.equal(result.ok, false)
  })
})

describe('moddableAdapter metadata', () => {
  it('has correct name and supported platforms', async () => {
    const { moddableAdapter } = await import('../../../src/toolbox/adapters/moddable/index.js')
    assert.equal(moddableAdapter.name, 'moddable')
    assert.deepEqual(moddableAdapter.platforms, ['mac', 'lin', 'win'])
  })
})
