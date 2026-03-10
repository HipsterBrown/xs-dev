import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { listPlatforms, getPlatform } from '#src/platforms/index.js'

describe('platform registry', () => {
  it('listPlatforms returns ["esp32"]', () => {
    const names = listPlatforms()
    assert.deepEqual(names, ['esp32'])
  })

  it('getPlatform("esp32") returns platform with correct manifest', async () => {
    const platform = await getPlatform('esp32')
    assert.ok(platform !== null)
    assert.equal(platform?.manifest.name, 'esp32')
  })

  it('getPlatform("unknown") returns null', async () => {
    const platform = await getPlatform('unknown')
    assert.equal(platform, null)
  })
})
