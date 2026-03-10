import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'

describe('Esp32Platform.resolveEnvironment() - missing scripts', async () => {
  mock.module('node:fs', {
    namedExports: {
      ...fs,
      existsSync: mock.fn(() => false),
    }
  })

  it('reports activationSucceeded=false when activation script is missing', async () => {
    const { Esp32Platform } = await import('#src/platforms/esp32/index.js')
    const platform = await Esp32Platform.load()
    const resolved = await platform.resolveEnvironment()

    assert.ok(!resolved.activationSucceeded)
    assert.ok((resolved.activationErrors?.length ?? 0) > 0)
    assert.ok(resolved.activationErrors?.[0]?.includes('not found'))
  })
})
