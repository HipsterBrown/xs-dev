import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/setup/zephyr', async () => {
  mock.module('#src/toolbox/setup/moddable.js', {
    namedExports: {
      moddableExists: mock.fn(() => true),
      getModdableVersion: mock.fn(async () => null),
      downloadReleaseTools: mock.fn(async () => {}),
      fetchRelease: mock.fn(async () => ({ tag_name: 'v1.0.0' })),
    }
  })
  mock.module('execa', {
    namedExports: {
      execaCommand: mock.fn(async () => ({ stdout: '' })),
      execa: mock.fn(async () => ({ stdout: '' })),
    }
  })
  mock.module('node:fs/promises', {
    namedExports: {
      mkdir: mock.fn(async () => {}),
      readFile: mock.fn(async () => ''),
      writeFile: mock.fn(async () => {}),
      readdir: mock.fn(async () => []),
      copyFile: mock.fn(async () => {}),
      chmod: mock.fn(async () => {}),
      symlink: mock.fn(async () => {}),
      stat: mock.fn(async () => ({})),
    }
  })
  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => false),
      statSync: mock.fn(() => ({ isDirectory: () => false, isFile: () => false })),
      renameSync: mock.fn(() => {}),
      rmSync: mock.fn(() => {}),
      createWriteStream: mock.fn(() => ({ on: mock.fn((event, cb) => cb()) })),
    }
  })
  mock.module('#src/toolbox/setup/homebrew.js', {
    namedExports: {
      ensureHomebrew: mock.fn(async function* () { yield { type: 'info' } }),
      formulaeExists: mock.fn(() => false),
    }
  })

  const { default: setupZephyr } = await import('#src/toolbox/setup/zephyr.js')

  it('yields step:start event at the beginning', async () => {
    const events = await Array.fromAsync(
      setupZephyr({}, createNonInteractivePrompter())
    )
    const types = events.map(e => e.type)
    assert.ok(types.includes('step:start'))
  })
})
