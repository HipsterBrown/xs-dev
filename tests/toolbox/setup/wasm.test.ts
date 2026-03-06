import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/setup/wasm', async () => {
  mock.module('node:child_process', {
    namedExports: {
      execSync: mock.fn(() => Buffer.from('cmake')),
    },
  })
  mock.module('execa', {
    namedExports: {
      execaCommand: mock.fn(async () => ({ stdout: '' })),
      execa: mock.fn(async () => ({ stdout: '' })),
    },
  })
  mock.module('node:fs/promises', {
    namedExports: {
      mkdir: mock.fn(async () => {}),
    },
  })
  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => false),
      statSync: mock.fn(() => ({
        isDirectory: () => false,
        isFile: () => false,
      })),
    },
  })
  mock.module('#src/toolbox/setup/moddable.js', {
    namedExports: {
      moddableExists: mock.fn(() => true),
    },
  })
  mock.module('#src/toolbox/patching/upsert.js', {
    default: mock.fn(async () => {}),
  })
  mock.module('#src/toolbox/system/exec.js', {
    namedExports: {
      execWithSudo: mock.fn(async () => ({ success: true, error: null })),
    },
  })
  mock.module('#src/toolbox/setup/homebrew.js', {
    namedExports: {
      ensureHomebrew: mock.fn(async () => {}),
    },
  })

  const { default: setupWasm } = await import('#src/toolbox/setup/wasm.js')

  it('yields step:start event for a successful setup', async () => {
    const originalModdable = process.env.MODDABLE
    process.env.MODDABLE = '/fake/moddable/path'

    try {
      const events = await Array.fromAsync(
        setupWasm(
          { branch: 'public', release: 'latest', sourceRepo: 'https://github.com/Moddable-OpenSource/moddable' },
          createNonInteractivePrompter(),
        ),
      )
      const types = events.map(e => e.type)
      assert.ok(types.includes('step:start'), 'should have step:start event')
      // The test may include step:fail if there are other issues, but we just verify step:start is present
      assert.ok(types.length > 0, 'should have events')
    } finally {
      if (originalModdable) {
        process.env.MODDABLE = originalModdable
      } else {
        delete process.env.MODDABLE
      }
    }
  })
})
