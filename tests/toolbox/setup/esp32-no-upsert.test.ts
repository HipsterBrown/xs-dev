import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/setup/esp32 (regression: no upsert calls)', async () => {
  mock.module('#src/toolbox/setup/moddable.js', {
    namedExports: {
      moddableExists: mock.fn(() => true),
      getModdableVersion: mock.fn(async () => ({ success: true, data: '4.4.0' })),
    }
  })
  mock.module('execa', {
    namedExports: {
      execaCommand: mock.fn(async () => ({ stdout: '' })),
    }
  })
  mock.module('node:fs/promises', {
    namedExports: {
      mkdir: mock.fn(async () => {}),
      readFile: mock.fn(async () => ''),
    }
  })
  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => false),
    }
  })
  mock.module('#src/toolbox/system/exec.js', {
    namedExports: {
      sourceEnvironment: mock.fn(async () => {}),
    }
  })
  mock.module('#src/toolbox/setup/esp32/mac.js', {
    namedExports: {
      installDeps: mock.fn(async function* () { yield { type: 'info', message: 'test' } }),
    }
  })
  mock.module('#src/toolbox/setup/esp32/linux.js', {
    namedExports: {
      installDeps: mock.fn(async function* () { yield { type: 'info', message: 'test' } }),
    }
  })
  mock.module('#src/toolbox/setup/esp32/windows.js', {
    namedExports: {
      installDeps: mock.fn(async function* () { yield { type: 'info', message: 'test' } }),
    }
  })
  mock.module('#src/toolbox/setup/windows.js', {
    namedExports: {
      setEnv: mock.fn(async () => {}),
    }
  })

  const { default: setupEsp32 } = await import('#src/toolbox/setup/esp32.js')

  it('completes setup without importing upsert module', async () => {
    const events = await Array.fromAsync(
      setupEsp32({}, createNonInteractivePrompter())
    )
    assert.ok(events.length > 0, `Should yield events. Got: ${JSON.stringify(events)}`)
    const types = events.map(e => e.type)
    const hasFailure = events.some(e => e.type === 'step:fail')
    assert.ok(!hasFailure, `Should not have step:fail. Events: ${JSON.stringify(events)}`)
  })
})
