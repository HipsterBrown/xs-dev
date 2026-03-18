import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/update/esp32 (via adapter)', async () => {
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
      execaCommand: mock.fn(async () => ({ exitCode: 0, stdout: '' })),
      execa: mock.fn(async () => ({ exitCode: 0, stdout: '' })),
    }
  })
  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => false),
      statSync: mock.fn(() => ({ isDirectory: () => false, isFile: () => false })),
      renameSync: mock.fn(() => {}),
      rmSync: mock.fn(() => {}),
      createWriteStream: mock.fn(() => ({ on: mock.fn((event: string, cb: () => void) => cb()) })),
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
  mock.module('#src/toolbox/system/exec.js', {
    namedExports: {
      sourceEnvironment: mock.fn(async () => {}),
    }
  })
  mock.module('#src/toolbox/adapters/esp32/mac.js', {
    namedExports: {
      installMacDeps: mock.fn(async function* () { yield { type: 'info', message: 'test' } }),
    }
  })
  mock.module('#src/toolbox/adapters/esp32/linux.js', {
    namedExports: {
      installLinuxDeps: mock.fn(async function* () { yield { type: 'info', message: 'test' } }),
    }
  })
  mock.module('#src/toolbox/patching/replace.js', {
    namedExports: {
      replace: mock.fn(async () => {}),
    }
  })

  const { esp32Adapter } = await import('#src/toolbox/adapters/esp32/index.js')

  it('yields events during update', async () => {
    const prompter = createNonInteractivePrompter()
    const events = await Array.fromAsync(esp32Adapter.update({ platform: 'mac', arch: 'arm64' }, prompter))
    assert.ok(events.length > 0, 'Should yield at least one event')
    const types = events.map(e => e.type)
    assert.ok(types.some(t => t === 'info' || t === 'step:start' || t === 'step:done' || t === 'step:fail'))
  })
})
