import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/setup/pico', async () => {
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
      readdir: mock.fn(async () => []),
    }
  })
  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => false),
      statSync: mock.fn(() => ({ isDirectory: () => true })),
    }
  })

  const { default: setupPico } = await import('#src/toolbox/setup/pico.js')

  it('yields step:start event at the beginning', async () => {
    const events = await Array.fromAsync(
      setupPico({}, createNonInteractivePrompter())
    )
    const types = events.map(e => e.type)
    assert.ok(types.includes('step:start'))
  })
})
