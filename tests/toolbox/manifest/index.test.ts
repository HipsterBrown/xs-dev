import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { addInclude, removeInclude } from '#src/toolbox/manifest/index.js'
import type { Manifest } from '#src/toolbox/manifest/index.js'

describe('manifest utility', () => {
  describe('addInclude', () => {
    it('adds include to empty manifest', () => {
      const manifest: Manifest = {}
      const result = addInclude(manifest, '$(MODDABLE)/modules/network/wifi/manifest.json')
      assert.deepEqual(result.include, '$(MODDABLE)/modules/network/wifi/manifest.json')
    })

    it('converts string include to array when adding second include', () => {
      const manifest: Manifest = { include: '$(MODDABLE)/modules/io/manifest.json' }
      const result = addInclude(manifest, '$(MODDABLE)/modules/network/wifi/manifest.json')
      assert.deepEqual(result.include, [
        '$(MODDABLE)/modules/io/manifest.json',
        '$(MODDABLE)/modules/network/wifi/manifest.json',
      ])
    })

    it('does not duplicate an existing include', () => {
      const manifest: Manifest = { include: '$(MODDABLE)/modules/io/manifest.json' }
      const result = addInclude(manifest, '$(MODDABLE)/modules/io/manifest.json')
      assert.deepEqual(result.include, '$(MODDABLE)/modules/io/manifest.json')
    })

    it('adds include under platform when device is specified', () => {
      const manifest: Manifest = {}
      const result = addInclude(manifest, '$(MODDABLE)/modules/io/manifest.json', 'esp32')
      assert.deepEqual(
        (result.platforms as Record<string, Manifest>)['esp32'].include,
        '$(MODDABLE)/modules/io/manifest.json',
      )
    })

    it('does not mutate the input manifest', () => {
      const manifest: Manifest = { include: '$(MODDABLE)/modules/io/manifest.json' }
      const original = structuredClone(manifest)
      addInclude(manifest, '$(MODDABLE)/modules/network/wifi/manifest.json')
      assert.deepEqual(manifest, original)
    })
  })

  describe('removeInclude', () => {
    it('removes matching include by name substring', () => {
      const manifest: Manifest = {
        include: [
          '$(MODDABLE)/modules/network/wifi/manifest.json',
          '$(MODDABLE)/modules/io/manifest.json',
        ],
      }
      const { manifest: result, removed } = removeInclude(manifest, 'wifi')
      assert.deepEqual(result.include, '$(MODDABLE)/modules/io/manifest.json')
      assert.deepEqual(removed, ['$(MODDABLE)/modules/network/wifi/manifest.json'])
    })

    it('deletes include key when all entries removed', () => {
      const manifest: Manifest = { include: '$(MODDABLE)/modules/io/manifest.json' }
      const { manifest: result, removed } = removeInclude(manifest, 'io')
      assert.equal('include' in result, false)
      assert.equal(removed.length, 1)
    })

    it('returns empty removed array when module not found', () => {
      const manifest: Manifest = { include: '$(MODDABLE)/modules/io/manifest.json' }
      const { manifest: result, removed } = removeInclude(manifest, 'wifi')
      assert.deepEqual(result.include, '$(MODDABLE)/modules/io/manifest.json')
      assert.deepEqual(removed, [])
    })

    it('handles string include (normalizes to array first)', () => {
      const manifest: Manifest = { include: '$(MODDABLE)/modules/wifi/manifest.json' }
      const { removed } = removeInclude(manifest, 'wifi')
      assert.equal(removed.length, 1)
    })

    it('removes include from platform when device is specified', () => {
      const manifest: Manifest = {
        platforms: { esp32: { include: '$(MODDABLE)/modules/io/manifest.json' } },
      }
      const { manifest: result, removed } = removeInclude(manifest, 'io', 'esp32')
      const platform = (result.platforms as Record<string, Manifest>)['esp32']
      assert.equal('include' in platform, false)
      assert.equal(removed.length, 1)
    })

    it('does not mutate the input manifest', () => {
      const manifest: Manifest = {
        include: [
          '$(MODDABLE)/modules/network/wifi/manifest.json',
          '$(MODDABLE)/modules/io/manifest.json',
        ],
      }
      const original = structuredClone(manifest)
      removeInclude(manifest, 'wifi')
      assert.deepEqual(manifest, original)
    })

    it('does not create spurious platform entry when device does not exist', () => {
      const manifest: Manifest = {}
      const { manifest: result } = removeInclude(manifest, 'wifi', 'esp32')
      // Should not create a platforms key if the device doesn't exist
      assert.equal('platforms' in result, false)
    })
  })
})
