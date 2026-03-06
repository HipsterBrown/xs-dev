import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/setup/esp8266', async () => {
  mock.module('#src/toolbox/setup/moddable.js', {
    namedExports: {
      moddableExists: mock.fn(() => true),
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
    }
  })
  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => false),
    }
  })
  mock.module('unzip-stream', {
    namedExports: {
      Extract: mock.fn(() => ({
        pipe: mock.fn(),
      }))
    }
  })
  mock.module('tar-fs', {
    namedExports: {
      extract: mock.fn(() => ({
        pipe: mock.fn(),
      }))
    }
  })

  const { default: setupEsp8266 } = await import('#src/toolbox/setup/esp8266.js')

  it('yields step:start event at the beginning', async () => {
    const events = await Array.fromAsync(
      setupEsp8266({}, createNonInteractivePrompter())
    )
    const types = events.map(e => e.type)
    assert.ok(types.includes('step:start'))
  })
})
