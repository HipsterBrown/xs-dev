import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PlatformManifestSchema } from '#src/platforms/target.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function loadManifest() {
  const raw = await readFile(
    resolve(__dirname, '../../../src/platforms/esp32/platform.json'),
    'utf-8'
  )
  return PlatformManifestSchema.parse(JSON.parse(raw))
}

describe('esp32 platform.json', () => {
  it('is valid per PlatformManifestSchema', async () => {
    // Will throw if invalid — Zod parse error includes details
    const manifest = await loadManifest()
    assert.equal(manifest.name, 'esp32')
  })

  it('supports darwin and linux for setup, not win32', async () => {
    const manifest = await loadManifest()
    assert.ok(manifest.capabilities.setup.darwin)
    assert.ok(manifest.capabilities.setup.linux)
    assert.ok(!manifest.capabilities.setup.win32)
  })

  it('has IDF_PATH and MODDABLE env vars with defaultPath', async () => {
    const manifest = await loadManifest()
    assert.ok(manifest.env?.IDF_PATH?.defaultPath)
    assert.ok(manifest.env?.MODDABLE?.defaultPath)
  })

  it('has activation script referencing $IDF_PATH', async () => {
    const manifest = await loadManifest()
    const scripts = manifest.activation?.scripts ?? []
    assert.ok(scripts.some(s => s.includes('IDF_PATH')))
  })

  it('marks moddable-sdk and esp-idf as requiresEnv', async () => {
    const manifest = await loadManifest()
    assert.ok(manifest.dependencies['moddable-sdk']?.requiresEnv)
    assert.ok(manifest.dependencies['esp-idf']?.requiresEnv)
  })

  it('marks cmake and python3 as bare-env deps (requiresEnv: false)', async () => {
    const manifest = await loadManifest()
    assert.ok(!manifest.dependencies['cmake']?.requiresEnv)
    assert.ok(!manifest.dependencies['python3']?.requiresEnv)
  })
})
