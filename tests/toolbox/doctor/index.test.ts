import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

describe('toolbox/doctor', async () => {
  mock.module('node:os', {
    namedExports: {
      type: mock.fn(() => 'Linux'),
      arch: mock.fn(() => 'x64'),
    },
  })

  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => false),
      statSync: mock.fn(() => ({ isDirectory: () => false, isFile: () => false })),
    },
  })

  mock.module('#src/toolbox/setup/moddable.js', {
    namedExports: {
      moddableExists: mock.fn(() => false),
      getModdableVersion: mock.fn(async () => ({ success: false, error: 'not found' })),
    },
  })

  mock.module('#src/toolbox/system/exec.js', {
    namedExports: {
      sourceEnvironment: mock.fn(async () => {}),
      which: mock.fn(() => null),
    },
  })

  mock.module('#src/toolbox/system/python.js', {
    namedExports: {
      detectPython: mock.fn(() => null),
      getPythonVersion: mock.fn(async () => ({ success: false, error: 'not found' })),
    },
  })

  const { gatherEnvironmentInfo } = await import('#src/toolbox/doctor/index.js')

  it('returns environment info structure', async () => {
    const info = await gatherEnvironmentInfo('1.0.0', { adapterList: [], ctx: { platform: 'lin', arch: 'x64' } })
    assert.ok(typeof info.cliVersion === 'string', 'cliVersion should be string')
    assert.ok(Array.isArray(info.supportedDevices), 'supportedDevices should be array')
    assert.ok(typeof info.moddableVersion === 'string', 'moddableVersion should be string')
    assert.ok(typeof info.pythonVersion === 'string', 'pythonVersion should be string')
  })

  it('detects no supported devices when env vars unset', async () => {
    const savedIdfPath = process.env.IDF_PATH
    delete process.env.IDF_PATH

    try {
      const info = await gatherEnvironmentInfo('1.0.0', { adapterList: [], ctx: { platform: 'lin', arch: 'x64' } })
      assert.ok(!info.supportedDevices.includes('esp32'), 'Should not include esp32 without IDF_PATH')
    } finally {
      if (savedIdfPath !== undefined) process.env.IDF_PATH = savedIdfPath
    }
  })
})
