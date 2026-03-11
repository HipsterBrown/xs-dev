import { describe, it, mock, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

describe('toolbox/teardown', async () => {
  const removedPaths: string[] = []
  const copiedFiles: Array<{ src: string; dst: string }> = []
  const readFiles: Array<{ path: string; content: string }> = []
  const writtenFiles: Array<{ path: string; content: string }> = []

  beforeEach(() => {
    removedPaths.length = 0
    copiedFiles.length = 0
    readFiles.length = 0
    writtenFiles.length = 0
  })

  mock.module('node:fs', {
    namedExports: {
      rmSync: mock.fn((path: string) => {
        removedPaths.push(path)
      }),
      cpSync: mock.fn((src: string, dst: string) => {
        copiedFiles.push({ src, dst })
      }),
      existsSync: mock.fn((path: string) => {
        if (path.includes('xs-dev-exports.sh')) return false
        if (path.includes('.zshrc')) return true
        if (path.includes('ejectfix')) return false
        if (path.includes('com.apple.ncprefs.plist')) return false
        return false
      }),
      statSync: mock.fn(() => ({ isFile: () => false })),
    },
  })

  mock.module('node:fs/promises', {
    namedExports: {
      readFile: mock.fn(async (path: string) => {
        const content = 'some content\nsource /fake/home/.local/share/xs-dev-export.sh\nother content'
        readFiles.push({ path, content })
        return content
      }),
      writeFile: mock.fn(async (path: string, content: string) => {
        writtenFiles.push({ path, content })
      }),
    },
  })

  mock.module('node:os', {
    namedExports: {
      type: mock.fn(() => 'Linux'),
      homedir: mock.fn(() => '/fake/home'),
    },
  })

  mock.module('#src/toolbox/setup/constants.js', {
    namedExports: {
      INSTALL_DIR: '/fake/install',
      EXPORTS_FILE_PATH: '/fake/home/.local/share/xs-dev-export.sh',
      getProfilePath: mock.fn(() => '/fake/home/.zshrc'),
      HOME_DIR: '/fake/home',
      INSTALL_PATH: '/fake/install/moddable',
      XSBUG_LOG_PATH: '/fake/install/moddable/tools/xsbug-log',
      MODDABLE_REPO: 'https://github.com/Moddable-OpenSource/moddable',
    },
  })

  const { teardown } = await import('#src/toolbox/teardown/index.js')

  it('removes the exports file', async () => {
    await teardown()
    assert.ok(
      removedPaths.some((p) => p.includes('xs-dev-export.sh')),
      'Should remove exports file',
    )
  })

  it('removes all installation directories', async () => {
    await teardown()
    assert.ok(removedPaths.some((p) => p.includes('moddable')), 'Should remove moddable')
    assert.ok(removedPaths.some((p) => p.includes('wasm')), 'Should remove wasm')
    assert.ok(removedPaths.some((p) => p.includes('esp32')), 'Should remove esp32')
    assert.ok(removedPaths.some((p) => p.includes('esp')), 'Should remove esp')
    assert.ok(removedPaths.some((p) => p.includes('pico')), 'Should remove pico')
    assert.ok(removedPaths.some((p) => p.includes('fontbm')), 'Should remove fontbm')
    assert.ok(removedPaths.some((p) => p.includes('nrf52')), 'Should remove nrf52')
    assert.ok(removedPaths.some((p) => p.includes('zephyrproject')), 'Should remove zephyrproject')
  })

  it('patches the profile file to remove source line', async () => {
    await teardown()
    // Verify that readFile was called for the profile
    assert.ok(readFiles.length > 0, 'Should read profile file')
    // Verify that writeFile was called with the patched content
    assert.ok(writtenFiles.length > 0, 'Should write patched profile file')
    const written = writtenFiles[0]
    assert.ok(
      !written.content.includes('source /fake/home/.local/share/xs-dev-export.sh'),
      'Written content should not contain the source line',
    )
  })

  it('calls rmSync with recursive and force options', async () => {
    await teardown()
    // rmSync should have been called multiple times
    assert.ok(removedPaths.length >= 8, `Expected at least 8 removals, got ${removedPaths.length}`)
  })

  it('does not copy plist or remove ejectfix on non-Darwin platforms', async () => {
    await teardown()
    assert.equal(copiedFiles.length, 0, 'Should not copy plist on Linux')
    assert.ok(
      !removedPaths.some((p) => p.includes('ejectfix')),
      'Should not remove ejectfix on Linux',
    )
  })

  it('does not remove xsbug.app on non-Darwin platforms', async () => {
    await teardown()
    assert.ok(
      !removedPaths.some((p) => p.includes('xsbug.app')),
      'Should not remove xsbug.app on Linux',
    )
  })
})
