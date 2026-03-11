import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/setup/windows', async () => {
  mock.module('node:child_process', {
    namedExports: {
      execSync: mock.fn(() => Buffer.from('nmake')),
    },
  })
  mock.module('execa', {
    namedExports: {
      execa: mock.fn(async () => ({ stdout: '' })),
      execaCommand: mock.fn(async () => ({ exitCode: 0, stdout: '' })),
    },
  })
  mock.module('node:fs/promises', {
    namedExports: {
      mkdir: mock.fn(async () => { }),
      readdir: mock.fn(async () => []),
      copyFile: mock.fn(async () => { }),
      readFile: mock.fn(async () => ''),
      writeFile: mock.fn(async () => { }),
      chmod: mock.fn(async () => { }),
      symlink: mock.fn(async () => { }),
      stat: mock.fn(async () => ({})),
    },
  })
  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => false),
      statSync: mock.fn(() => ({ isDirectory: () => false, isFile: () => false })),
      renameSync: mock.fn(() => { }),
      rmSync: mock.fn(() => { }),
      createWriteStream: mock.fn(() => ({ on: mock.fn((event, cb) => cb()) })),
    },
  })
  mock.module('windows-shortcuts', {
    default: {
      create: (path: string, options: unknown, callback: (err: unknown) => void) => {
        callback(null)
      },
    },
  })
  mock.module('#src/toolbox/setup/moddable.js', {
    namedExports: {
      moddableExists: mock.fn(() => true),
      getModdableVersion: mock.fn(async () => null),
      fetchRelease: mock.fn(async () => ({
        success: true,
        data: {
          tag_name: 'v1.0.0',
          assets: [{ name: 'moddable-tools-win64.zip' }],
        },
      })),
      downloadReleaseTools: mock.fn(async () => { }),
    },
  })
  mock.module('#src/toolbox/patching/upsert.js', {
    defaultExport: mock.fn(async () => { }),
  })

  const { default: setupWindows } = await import('#src/toolbox/setup/windows.js')

  it('yields step:start event for setup', async () => {
    const prompter = createNonInteractivePrompter()
    // Mock VSINSTALLDIR so we skip the VS installation check
    const originalVS = process.env.VSINSTALLDIR
    process.env.VSINSTALLDIR = 'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community'

    try {
      const events = await Array.fromAsync(
        setupWindows(
          { branch: 'public', release: 'latest', sourceRepo: 'https://github.com/Moddable-OpenSource/moddable' },
          prompter,
        ),
      )
      const types = events.map(e => e.type)
      assert.ok(types.includes('step:start'), 'should have step:start event')
    } finally {
      if (originalVS) {
        process.env.VSINSTALLDIR = originalVS
      } else {
        delete process.env.VSINSTALLDIR
      }
    }
  })
})
