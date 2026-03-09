import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/setup/ejectfix', async () => {
  mock.module('node:fs/promises', {
    namedExports: {
      mkdir: mock.fn(async () => {}),
      copyFile: mock.fn(async () => {}),
    }
  })
  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => false),
    }
  })
  mock.module('execa', {
    namedExports: {
      execaCommand: mock.fn(async () => ({ exitCode: 0, stdout: '' })),
    }
  })
  mock.module('simple-plist', {
    namedExports: {
      readFileSync: mock.fn(() => ({ apps: [] })),
      writeBinaryFileSync: mock.fn(() => {}),
    }
  })

  const { default: ejectfix } = await import('#src/toolbox/setup/ejectfix.js')

  it('ejectfix yields step:fail on non-darwin OS', async () => {
    const prompter = createNonInteractivePrompter()
    const events = await Array.fromAsync(ejectfix({}, prompter))
    const types = events.map(e => e.type)
    assert.ok(types.includes('step:fail'))
  })

  it('ejectfix starts with step:start event', async () => {
    const prompter = createNonInteractivePrompter()
    const events = await Array.fromAsync(ejectfix({}, prompter))
    assert.strictEqual(events[0].type, 'step:start')
  })
})
