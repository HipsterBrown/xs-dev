import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PlatformManifestSchema } from '#src/platforms/target.js'

describe('PlatformManifestSchema', () => {
  it('validates a minimal valid manifest', () => {
    const result = PlatformManifestSchema.safeParse({
      name: 'esp32',
      version: '1.0.0',
      displayName: 'ESP32',
      description: 'ESP32 platform',
      dependencies: {},
      capabilities: {
        setup: { darwin: true, linux: true, win32: false },
        update: { darwin: true, linux: true, win32: false },
        teardown: { darwin: true, linux: true, win32: false },
      },
    })
    assert.ok(result.success)
  })

  it('rejects manifest with uppercase name', () => {
    const result = PlatformManifestSchema.safeParse({
      name: 'ESP32',
      version: '1.0.0',
      displayName: 'ESP32',
      description: 'test',
      dependencies: {},
      capabilities: {
        setup: { darwin: false, linux: false, win32: false },
        update: { darwin: false, linux: false, win32: false },
        teardown: { darwin: false, linux: false, win32: false },
      },
    })
    assert.ok(!result.success)
  })

  it('validates a dependency with all optional fields', () => {
    const result = PlatformManifestSchema.safeParse({
      name: 'test-platform',
      version: '1.0.0',
      displayName: 'Test',
      description: 'test',
      dependencies: {
        cmake: {
          type: 'build-tool',
          version: '>=3.16.0',
          versionCommand: 'cmake --version',
          versionPattern: 'cmake version (\\S+)',
          installHint: { darwin: 'brew install cmake' },
        },
      },
      capabilities: {
        setup: { darwin: true, linux: true, win32: false },
        update: { darwin: true, linux: true, win32: false },
        teardown: { darwin: true, linux: true, win32: false },
      },
    })
    assert.ok(result.success)
  })
})
