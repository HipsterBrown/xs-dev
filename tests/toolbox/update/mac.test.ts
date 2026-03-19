import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/adapters/moddable/mac (update)', async () => {
  mock.module('#src/toolbox/setup/moddable.js', {
    namedExports: {
      moddableExists: mock.fn(() => true),
      getModdableVersion: mock.fn(async () => null),
      fetchRelease: mock.fn(async () => null),
      downloadReleaseTools: mock.fn(async () => {}),
      MissingReleaseAssetError: class MissingReleaseAssetError extends Error {
        constructor(assetName: string) {
          super(`Unable to find release asset matching ${assetName}`)
        }
      },
    }
  })
  mock.module('execa', {
    namedExports: {
      execaCommand: mock.fn(async () => ({ exitCode: 0, stdout: '' })),
      execa: mock.fn(async () => ({ exitCode: 0, stdout: '' })),
    }
  })
  mock.module('node:fs/promises', {
    namedExports: {
      mkdir: mock.fn(async () => {}),
      readdir: mock.fn(async () => []),
      copyFile: mock.fn(async () => {}),
      chmod: mock.fn(async () => {}),
      readFile: mock.fn(async () => ''),
      writeFile: mock.fn(async () => {}),
      symlink: mock.fn(async () => {}),
    }
  })
  mock.module('#src/toolbox/system/exec.js', {
    namedExports: {
      sourceEnvironment: mock.fn(async () => {}),
      which: mock.fn(() => null),
      execWithSudo: mock.fn(async () => ({ success: true, data: undefined })),
      pkexec: mock.fn(async () => ({ success: true, data: undefined })),
    }
  })

  const { updateMac } = await import('#src/toolbox/toolchains/moddable/mac.js')

  it('yields events during update', async () => {
    const prompter = createNonInteractivePrompter()
    const ctx = { platform: 'mac' as const, arch: 'x64' as const }
    const events = await Array.fromAsync(updateMac(ctx, prompter))
    assert.ok(events.length > 0, 'Should yield at least one event')
    const types = events.map(e => e.type)
    assert.ok(types.some(t => t === 'info' || t === 'step:start' || t === 'step:done' || t === 'step:fail'))
  })
})
