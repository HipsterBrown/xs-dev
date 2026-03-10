import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/setup/esp8266', async () => {
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
  mock.module('#src/toolbox/setup/homebrew.js', {
    namedExports: {
      ensureHomebrew: mock.fn(async function* () { yield { type: 'info' } }),
      formulaeExists: mock.fn(() => false),
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
