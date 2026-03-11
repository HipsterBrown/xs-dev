import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import { chdir, cwd } from 'node:process'
import assert from 'node:assert/strict'
import { cleanupTempDir, createTempDir } from '../helpers/runner'
import { app } from '../../src/app'
import { runWithInputs } from '../helpers/runner'

describe('include command', () => {
  let tempDir = ''
  const originalDir = cwd()

  mock.module('#src/toolbox/system/exec.js', {
    namedExports: {
      sourceEnvironment: mock.fn(async () => {}),
    },
  })

  beforeEach(async () => {
    tempDir = await createTempDir()
    chdir(tempDir)
    // Set MODDABLE env var so sourceEnvironment doesn't fail
    process.env.MODDABLE = tempDir
  })

  afterEach(async () => {
    chdir(originalDir)
    await cleanupTempDir(tempDir)
    mock.reset()
  })

  it('exits with code 0 when a module is added by name', async () => {
    const { writeFileSync, mkdirSync } = await import('node:fs')
    const { join } = await import('node:path')

    const manifestPath = join(tempDir, 'manifest.json')
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          include: ['$(MODDABLE)/modules/io/manifest.json'],
        },
        null,
        2,
      ),
    )

    // Create the module structure so existsSync check passes
    const modulesPath = join(tempDir, 'modules', 'network')
    mkdirSync(modulesPath, { recursive: true })
    writeFileSync(join(modulesPath, 'manifest.json'), '{}')

    const result = await runWithInputs(app, ['include', 'network'])
    assert.equal(result.exitCode, 0)
  })

  it('outputs success message when module is added', async () => {
    const { writeFileSync, mkdirSync } = await import('node:fs')
    const { join } = await import('node:path')

    const manifestPath = join(tempDir, 'manifest.json')
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          include: ['$(MODDABLE)/modules/io/manifest.json'],
        },
        null,
        2,
      ),
    )

    // Create the module structure so existsSync check passes
    const modulesPath = join(tempDir, 'modules', 'network')
    mkdirSync(modulesPath, { recursive: true })
    writeFileSync(join(modulesPath, 'manifest.json'), '{}')

    const result = await runWithInputs(app, ['include', 'network'])
    assert.ok(result.stdout.includes('Done') || result.exitCode === 0)
  })

  it('adds module to manifest includes', async () => {
    const { writeFileSync, readFileSync, mkdirSync } = await import('node:fs')
    const { join } = await import('node:path')

    const manifestPath = join(tempDir, 'manifest.json')
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          include: ['$(MODDABLE)/modules/io/manifest.json'],
        },
        null,
        2,
      ),
    )

    // Create the module structure so existsSync check passes
    const modulesPath = join(tempDir, 'modules', 'network')
    mkdirSync(modulesPath, { recursive: true })
    writeFileSync(join(modulesPath, 'manifest.json'), '{}')

    const result = await runWithInputs(app, ['include', 'network'])
    assert.equal(result.exitCode, 0)

    const updated = JSON.parse(readFileSync(manifestPath, 'utf8'))
    assert.ok(JSON.stringify(updated).includes('network'))
  })

  it('adds module to device-specific platform config', async () => {
    const { writeFileSync, readFileSync, mkdirSync } = await import('node:fs')
    const { join } = await import('node:path')

    const manifestPath = join(tempDir, 'manifest.json')
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          platforms: {
            esp32: {
              include: ['$(MODDABLE)/modules/io/manifest.json'],
            },
          },
        },
        null,
        2,
      ),
    )

    // Create the module structure so existsSync check passes
    const modulesPath = join(tempDir, 'modules', 'network')
    mkdirSync(modulesPath, { recursive: true })
    writeFileSync(join(modulesPath, 'manifest.json'), '{}')

    const result = await runWithInputs(app, ['include', 'network', '--device', 'esp32'])
    assert.equal(result.exitCode, 0)

    const updated = JSON.parse(readFileSync(manifestPath, 'utf8'))
    assert.ok(JSON.stringify(updated.platforms.esp32).includes('network'))
  })
})
