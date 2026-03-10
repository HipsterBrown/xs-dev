import { describe, it, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

describe('Esp32Platform.checkDependencies()', () => {
  beforeEach(() => mock.reset())

  it('returns bare-tier results for cmake and python3', async () => {
    mock.module('node:fs', {
      namedExports: { existsSync: mock.fn(() => false) },
    })
    mock.module('#src/toolbox/system/execa.js', {
      namedExports: {
        execa: mock.fn(async (_b: string, [_f, cmd]: string[]) => {
          if (cmd?.includes('cmake')) return { stdout: 'cmake version 3.28.1', stderr: '' }
          if (cmd?.includes('python3')) return { stdout: 'Python 3.12.2', stderr: '' }
          if (cmd?.includes('ninja')) return { stdout: '1.11.1', stderr: '' }
          if (cmd?.includes('dfu-util')) return { stdout: 'dfu-util 0.11', stderr: '' }
          return { stdout: '', stderr: '' }
        }),
      },
    })

    const { Esp32Platform } = await import('#src/platforms/esp32/index.js')
    const platform = await Esp32Platform.load()
    const statuses = await platform.checkDependencies()

    const cmake = statuses.find(s => s.name === 'cmake')
    assert.ok(cmake)
    assert.equal(cmake.tier, 'bare')
    assert.equal(cmake.found, '3.28.1')
    assert.ok(cmake.healthy)

    const python = statuses.find(s => s.name === 'python3')
    assert.ok(python)
    assert.equal(python.tier, 'bare')
  })

  it('returns activated-tier results for esp-idf and moddable-sdk', async () => {
    mock.module('node:fs', {
      namedExports: { existsSync: mock.fn(() => true) },
    })
    mock.module('#src/toolbox/system/execa.js', {
      namedExports: {
        execa: mock.fn(async (_b: string, [_f, cmd]: string[]) => {
          if (cmd?.includes('env -0')) {
            return {
              stdout: 'IDF_PATH=/fake/idf\0MODDABLE=/fake/moddable\0PATH=/usr/bin\0',
              stderr: '',
            }
          }
          if (cmd?.includes('idf.py')) return { stdout: 'ESP-IDF v5.3.0', stderr: '' }
          if (cmd?.includes('mcconfig')) return { stdout: 'Moddable SDK version 5.0.0', stderr: '' }
          return { stdout: '', stderr: '' }
        }),
      },
    })

    const { Esp32Platform } = await import('#src/platforms/esp32/index.js')
    const platform = await Esp32Platform.load()
    const statuses = await platform.checkDependencies()

    const idf = statuses.find(s => s.name === 'esp-idf')
    assert.ok(idf)
    assert.equal(idf.tier, 'activated')

    const moddable = statuses.find(s => s.name === 'moddable-sdk')
    assert.ok(moddable)
    assert.equal(moddable.tier, 'activated')
  })

  it('reports all activated-tier deps as unhealthy when activation fails', async () => {
    mock.module('node:fs', {
      namedExports: { existsSync: mock.fn(() => false) }, // activation script missing
    })
    mock.module('#src/toolbox/system/execa.js', {
      namedExports: {
        execa: mock.fn(async () => ({ stdout: '', stderr: '' })),
      },
    })

    const { Esp32Platform } = await import('#src/platforms/esp32/index.js')
    const platform = await Esp32Platform.load()
    const statuses = await platform.checkDependencies()

    const activatedStatuses = statuses.filter(s => s.tier === 'activated')
    assert.ok(activatedStatuses.length > 0)
    for (const s of activatedStatuses) {
      assert.ok(!s.healthy, `${s.name} should be unhealthy when activation fails`)
      assert.ok(
        s.message?.includes('activation failed') || s.message?.includes('activation'),
        `${s.name} message should mention activation failure`,
      )
    }
  })
})
