import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { buildFakeContext, runWithInputs } from '../helpers/runner'

describe('doctor command (mocked)', async () => {
  mock.module('#src/platforms/index.js', {
    namedExports: {
      getPlatform: mock.fn(async (_name: string) => ({
        manifest: { name: 'esp32', displayName: 'ESP32' },
        checkDependencies: mock.fn(async () => [
          { name: 'cmake', expected: '>=3.16.0', found: '3.28.1', healthy: true, tier: 'bare' },
          { name: 'esp-idf', expected: '>=4.4.0', found: null, healthy: false, tier: 'activated', message: 'Environment activation failed: /fake/export.sh not found' },
        ]),
      })),
    }
  })
  mock.module('#src/toolbox/setup/moddable.js', {
    namedExports: {
      moddableExists: mock.fn(() => false),
      getModdableVersion: mock.fn(async () => ({ success: false, error: 'not found' })),
    }
  })
  mock.module('#src/toolbox/system/exec.js', {
    namedExports: {
      sourceEnvironment: mock.fn(async () => ({ success: true })),
      which: mock.fn(() => null),
    }
  })
  mock.module('#src/toolbox/system/python.js', {
    namedExports: {
      detectPython: mock.fn(() => null),
      getPythonVersion: mock.fn(async () => ({ success: false, error: 'not found' })),
    }
  })

  const { app } = await import('#src/app.js')

  it('shows unhealthy activated-tier deps when activation fails', async () => {
    const result = await runWithInputs(app, ['doctor'])

    assert.equal(result.exitCode, 0)
    assert.ok(result.stdout.includes('System dependencies'), `expected system deps section`)
    assert.ok(result.stdout.includes('Platform dependencies'), `expected platform deps section`)
    assert.ok(result.stdout.includes('cmake'), `expected cmake in output`)
    assert.ok(result.stdout.includes('esp-idf'), `expected esp-idf in output`)
    assert.ok(result.stdout.includes('activation failed'), `expected activation failure message`)
  })
})
