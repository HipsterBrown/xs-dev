import { describe, it, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/toolchains/moddable/mac (update)', async () => {
  const fsCp = mock.fn(async () => {})
  const fsCopyFile = mock.fn(async () => {})
  const fsReaddir = mock.fn<(p?: string) => Promise<string[]>>(async () => [])
  const fsChmod = mock.fn(async () => {})

  const fetchRelease = mock.fn<(_: string) => Promise<unknown>>(async () => null)
  const downloadReleaseTools = mock.fn(async () => {})

  const execaCommand = mock.fn<() => Promise<{ exitCode: number; stdout: string }>>(
    async () => ({ exitCode: 0, stdout: '' }),
  )
  const execa = mock.fn<() => Promise<{ exitCode: number; stdout: string }>>(
    async () => ({ exitCode: 0, stdout: '' }),
  )

  mock.module('#src/toolbox/setup/moddable.js', {
    namedExports: {
      moddableExists: mock.fn(() => true),
      getModdableVersion: mock.fn(async () => null),
      fetchRelease,
      downloadReleaseTools,
      MissingReleaseAssetError: class MissingReleaseAssetError extends Error {
        constructor(assetName: string) {
          super(`Unable to find release asset matching ${assetName}`)
        }
      },
    }
  })
  mock.module('execa', {
    namedExports: { execaCommand, execa },
  })
  mock.module('node:fs/promises', {
    namedExports: {
      cp: fsCp,
      mkdir: mock.fn(async () => {}),
      readdir: fsReaddir,
      copyFile: fsCopyFile,
      chmod: fsChmod,
      readFile: mock.fn(async () => ''),
      writeFile: mock.fn(async () => {}),
      symlink: mock.fn(async () => {}),
      stat: mock.fn(async () => {}),
      rm: mock.fn(async () => {}),
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

  beforeEach(() => {
    fsCp.mock.resetCalls()
    fsCopyFile.mock.resetCalls()
    fsReaddir.mock.resetCalls()
    fsChmod.mock.resetCalls()
    fetchRelease.mock.resetCalls()
    downloadReleaseTools.mock.resetCalls()
    execaCommand.mock.resetCalls()
    execa.mock.resetCalls()
  })

  it('yields events during update', async () => {
    const prompter = createNonInteractivePrompter()
    const ctx = { platform: 'mac' as const, arch: 'x64' as const }
    const events = await Array.fromAsync(updateMac(ctx, prompter))
    assert.ok(events.length > 0, 'Should yield at least one event')
    const types = events.map(e => e.type)
    assert.ok(types.some(t => t === 'info' || t === 'step:start' || t === 'step:done' || t === 'step:fail'))
  })

  it('uses recursive cp for .app bundles, not copyFile (regression: ENOTSUP on macOS bundle dirs)', async () => {
    fetchRelease.mock.mockImplementationOnce(async () => ({
      success: true,
      data: {
        tag_name: 'v9.9.9',
        assets: [{ name: 'moddable-tools-macuniversal.zip' }],
      },
    }))
    fsReaddir.mock.mockImplementationOnce(async () => ['mcsim.app', 'xsbug.app', 'xst'])

    const prompter = createNonInteractivePrompter()
    const ctx = {
      platform: 'mac' as const,
      arch: 'x64' as const,
      version: 'release-v9.9.9',
    }

    const events = await Array.fromAsync(updateMac(ctx, prompter))

    const failures = events.filter(e => e.type === 'step:fail')
    assert.deepEqual(
      failures,
      [],
      `Update should not fail, got: ${JSON.stringify(failures)}`,
    )

    const copyFileSrcPaths = fsCopyFile.mock.calls.map(
      c => c.arguments[0] as string,
    )
    const cpCalls = fsCp.mock.calls.map(c => c.arguments)

    assert.ok(
      !copyFileSrcPaths.some(p => p.endsWith('mcsim.app') || p.endsWith('xsbug.app')),
      `copyFile must NOT be called on .app bundle directories (causes ENOTSUP on macOS). copyFile sources: ${JSON.stringify(copyFileSrcPaths)}`,
    )
    assert.ok(
      cpCalls.some(args =>
        typeof args[0] === 'string'
          && args[0].endsWith('mcsim.app')
          && args[2] !== undefined
          && (args[2] as { recursive?: boolean }).recursive === true,
      ),
      `cp must be called recursively on mcsim.app bundle. cp calls: ${JSON.stringify(cpCalls)}`,
    )
    assert.ok(
      copyFileSrcPaths.some(p => p.endsWith('xst')),
      `copyFile should still be used for plain files like xst. copyFile sources: ${JSON.stringify(copyFileSrcPaths)}`,
    )
  })
})
