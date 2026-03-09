import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/update/pico', async () => {
  mock.module('#src/toolbox/setup/moddable.js', {
    namedExports: {
      moddableExists: mock.fn(() => true),
    }
  })
  mock.module('execa', {
    namedExports: {
      execaCommand: mock.fn(async () => ({ exitCode: 0, stdout: '' })),
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
  mock.module('#src/toolbox/setup/pico/mac.js', {
    namedExports: {
      installDeps: mock.fn(async function* () { yield { type: 'info', message: 'test' } }),
    }
  })
  mock.module('#src/toolbox/setup/pico/linux.js', {
    namedExports: {
      installDeps: mock.fn(async function* () { yield { type: 'info', message: 'test' } }),
    }
  })

  const { default: updatePico } = await import('#src/toolbox/update/pico.js')

  it('yields events during update', async () => {
    const prompter = createNonInteractivePrompter()
    const events = await Array.fromAsync(updatePico({}, prompter))
    assert.ok(events.length > 0, 'Should yield at least one event')
    const types = events.map(e => e.type)
    assert.ok(types.some(t => t === 'info' || t === 'step:start' || t === 'step:done' || t === 'step:fail'))
  })
})
