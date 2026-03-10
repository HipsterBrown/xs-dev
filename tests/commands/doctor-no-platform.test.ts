import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { runWithInputs } from '../helpers/runner'

describe('doctor command (no platform)', async () => {
  mock.module('#src/platforms/index.js', {
    namedExports: {
      getPlatform: mock.fn(async (_name: string) => null),
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

  it('does not include dependency sections when platform is null', async () => {
    const result = await runWithInputs(app, ['doctor'])

    assert.ok(!result.stdout.includes('System dependencies'), `should not show dependency sections when no platform`)
    assert.ok(!result.stdout.includes('Platform dependencies'), `should not show dependency sections when no platform`)
  })
})
