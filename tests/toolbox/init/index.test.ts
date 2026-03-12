import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createNonInteractivePrompter } from '#src/lib/prompter.js'

describe('toolbox/init', async () => {
  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => false),
      statSync: mock.fn(() => ({ isDirectory: () => false })),
      readdirSync: mock.fn(() => []),
      mkdirSync: mock.fn(() => {}),
      cpSync: mock.fn(() => {}),
    },
  })

  mock.module('#src/toolbox/system/exec.js', {
    namedExports: {
      sourceEnvironment: mock.fn(async () => {}),
    },
  })

  mock.module('#src/toolbox/prompt/tree.js', {
    namedExports: {
      buildTree: mock.fn((dirPath: string, name: string) => ({
        name,
        type: 'dir',
        children: [],
      })),
    },
  })

  mock.module('#src/toolbox/prompt/choices.js', {
    namedExports: {
      collectChoicesFromTree: mock.fn(() => []),
    },
  })

  mock.module('#src/toolbox/init/templates.js', {
    namedExports: {
      createMain: mock.fn(async () => {}),
      createManifest: mock.fn(async () => {}),
      createPackageJSON: mock.fn(async () => {}),
      createTSConfig: mock.fn(async () => {}),
    },
  })

  const { default: initProject } = await import('#src/toolbox/init/index.js')

  it('yields events during project creation', async () => {
    const prompter = createNonInteractivePrompter()
    const events = await Array.fromAsync(
      initProject('my-project', {}, prompter),
    )
    assert.ok(events.length > 0, 'Should yield at least one event')
    const types = events.map((e) => e.type)
    assert.ok(
      types.some((t) => t === 'step:start' || t === 'step:done' || t === 'info' || t === 'warning'),
    )
  })

  it('yields warning when project directory already exists', async () => {
    const { existsSync, statSync } = await import('node:fs')
    ;(existsSync as ReturnType<typeof mock.fn>).mock.mockImplementation(() => true)
    ;(statSync as ReturnType<typeof mock.fn>).mock.mockImplementation(() => ({ isDirectory: () => true }))

    const prompter = createNonInteractivePrompter()
    const events = await Array.fromAsync(
      initProject('my-project', { overwrite: false }, prompter),
    )
    const warnings = events.filter((e) => e.type === 'warning')
    assert.ok(
      warnings.some((e) => e.message.includes('already exists')),
      'Should warn when directory exists',
    )
  })
})
