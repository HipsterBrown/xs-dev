import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

describe('Esp32Platform.resolveEnvironment() - with scripts', async () => {
  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => true),
    }
  })
  mock.module('#src/toolbox/system/execa.js', {
    namedExports: {
      execa: mock.fn(async (_bin: string, _args: string[], opts: { env?: Record<string, string> }) => ({
        stdout: `IDF_PATH=${opts?.env?.IDF_PATH ?? ''}\0MODDABLE=${opts?.env?.MODDABLE ?? ''}\0PATH=/usr/bin\0`
      }))
    }
  })

  it('expands $HOME in IDF_PATH defaultPath', async () => {
    const { Esp32Platform } = await import('#src/platforms/esp32/index.js')
    const platform = await Esp32Platform.load()
    const resolved = await platform.resolveEnvironment()

    const HOME = process.env.HOME ?? ''
    assert.ok(resolved.static.IDF_PATH?.startsWith(HOME), `IDF_PATH should start with $HOME`)
    assert.ok(resolved.static.MODDABLE?.startsWith(HOME), `MODDABLE should start with $HOME`)
    assert.ok(resolved.activationSucceeded)
  })

  it('accepts overrides for IDF_PATH', async () => {
    const { Esp32Platform } = await import('#src/platforms/esp32/index.js')
    const platform = await Esp32Platform.load()
    const resolved = await platform.resolveEnvironment({ IDF_PATH: '/opt/esp-idf' })

    assert.equal(resolved.static.IDF_PATH, '/opt/esp-idf')
  })
})

describe('Esp32Platform.supports()', async () => {
  it('returns true for setup on darwin and linux', async () => {
    const { Esp32Platform } = await import('#src/platforms/esp32/index.js')
    const platform = await Esp32Platform.load()
    assert.ok(platform.supports('setup', 'darwin'))
    assert.ok(platform.supports('setup', 'linux'))
    assert.ok(!platform.supports('setup', 'win32'))
  })
})
