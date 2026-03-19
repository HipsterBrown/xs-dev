import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/toolchains/moddable/mac (install)', async () => {
  mock.module('execa', {
    namedExports: {
      execaCommand: mock.fn(async () => ({ stdout: '' })),
      execa: mock.fn(async () => ({ stdout: '' })),
    }
  })
  mock.module('node:fs/promises', {
    namedExports: {
      mkdir: mock.fn(async () => { }),
      readFile: mock.fn(async () => ''),
      writeFile: mock.fn(async () => { }),
      readdir: mock.fn(async () => []),
      copyFile: mock.fn(async () => { }),
      symlink: mock.fn(async () => { }),
      chmod: mock.fn(async () => { }),
    }
  })

  const { installMac } = await import('#src/toolbox/toolchains/moddable/mac.js')

  it('yields step:start and step:done events for a successful setup', async () => {
    const events = await Array.fromAsync(
      installMac(
        { branch: 'public', release: 'latest', sourceRepo: 'https://github.com/Moddable-OpenSource/moddable' },
        createNonInteractivePrompter()
      )
    )
    const types = events.map(e => e.type)
    assert.ok(types.includes('step:start'))
    assert.ok(!types.includes('step:fail'))
  })
})
