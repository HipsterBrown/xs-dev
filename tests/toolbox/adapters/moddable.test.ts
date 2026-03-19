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

describe('parseModdableVersion', () => {
  it('is exported from moddable/index', async () => {
    const mod = await import('../../../src/toolbox/adapters/moddable/index.js')
    assert.equal(typeof (mod as Record<string, unknown>).parseModdableVersion, 'function')
  })

  it('undefined version → release latest, no branch, no sourceRepo', async () => {
    const { parseModdableVersion } = await import('../../../src/toolbox/adapters/moddable/index.js') as { parseModdableVersion: (v: string | undefined) => { release: string | undefined, branch: string | undefined, sourceRepo: string | undefined } }
    const result = parseModdableVersion(undefined)
    assert.equal(result.release, 'latest')
    assert.equal(result.branch, undefined)
    assert.equal(result.sourceRepo, undefined)
  })

  it('release-1.2.3 → release 1.2.3', async () => {
    const { parseModdableVersion } = await import('../../../src/toolbox/adapters/moddable/index.js') as { parseModdableVersion: (v: string | undefined) => { release: string | undefined, branch: string | undefined, sourceRepo: string | undefined } }
    const result = parseModdableVersion('release-1.2.3')
    assert.equal(result.release, '1.2.3')
    assert.equal(result.branch, undefined)
    assert.equal(result.sourceRepo, undefined)
  })

  it('branch-main → branch main', async () => {
    const { parseModdableVersion } = await import('../../../src/toolbox/adapters/moddable/index.js') as { parseModdableVersion: (v: string | undefined) => { release: string | undefined, branch: string | undefined, sourceRepo: string | undefined } }
    const result = parseModdableVersion('branch-main')
    assert.equal(result.release, undefined)
    assert.equal(result.branch, 'main')
    assert.equal(result.sourceRepo, undefined)
  })

  it('release-2.0.0@https://github.com/fork/moddable → release + sourceRepo', async () => {
    const { parseModdableVersion } = await import('../../../src/toolbox/adapters/moddable/index.js') as { parseModdableVersion: (v: string | undefined) => { release: string | undefined, branch: string | undefined, sourceRepo: string | undefined } }
    const result = parseModdableVersion('release-2.0.0@https://github.com/fork/moddable')
    assert.equal(result.release, '2.0.0')
    assert.equal(result.branch, undefined)
    assert.equal(result.sourceRepo, 'https://github.com/fork/moddable')
  })

  it('branch-dev@https://github.com/fork/moddable → branch + sourceRepo', async () => {
    const { parseModdableVersion } = await import('../../../src/toolbox/adapters/moddable/index.js') as { parseModdableVersion: (v: string | undefined) => { release: string | undefined, branch: string | undefined, sourceRepo: string | undefined } }
    const result = parseModdableVersion('branch-dev@https://github.com/fork/moddable')
    assert.equal(result.release, undefined)
    assert.equal(result.branch, 'dev')
    assert.equal(result.sourceRepo, 'https://github.com/fork/moddable')
  })
})
