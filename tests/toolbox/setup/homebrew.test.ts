import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/setup/homebrew', async () => {
  mock.module('execa', {
    namedExports: {
      execaCommand: mock.fn(async () => ({ exitCode: 0, stdout: '' })),
    }
  })
  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => true),
    }
  })
  mock.module('#src/toolbox/patching/upsert.js', {
    namedExports: {
      default: mock.fn(async () => {}),
    }
  })

  const { ensureHomebrew } = await import('#src/toolbox/setup/homebrew.js')

  it('ensureHomebrew yields info event when brew is available', async () => {
    const prompter = createNonInteractivePrompter()
    const events = await Array.fromAsync(ensureHomebrew(prompter))
    const types = events.map(e => e.type)
    assert.ok(types.includes('info') || types.includes('step:done'))
  })
})
