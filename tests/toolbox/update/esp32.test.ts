import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/update/esp32', async () => {
  mock.module('#src/toolbox/setup/moddable.js', {
    namedExports: {
      moddableExists: mock.fn(() => true),
      getModdableVersion: mock.fn(async () => null),
    }
  })
  mock.module('execa', {
    namedExports: {
      execaCommand: mock.fn(async () => ({ exitCode: 0, stdout: '' })),
      execa: mock.fn(async () => ({ exitCode: 0, stdout: '' })),
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
  mock.module('#src/toolbox/patching/replace.js', {
    namedExports: {
      replace: mock.fn(async () => {}),
    }
  })

  const { default: updateEsp32 } = await import('#src/toolbox/update/esp32.js')

  it('yields events during update', async () => {
    const prompter = createNonInteractivePrompter()
    const events = await Array.fromAsync(updateEsp32({}, prompter))
    assert.ok(events.length > 0, 'Should yield at least one event')
    const types = events.map(e => e.type)
    assert.ok(types.some(t => t === 'info' || t === 'step:start' || t === 'step:done' || t === 'step:fail'))
  })
})
