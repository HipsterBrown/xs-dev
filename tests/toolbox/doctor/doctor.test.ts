import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { TargetAdapter, AdapterContext } from '../../../src/lib/adapter.js'

function makeAdapter(
  name: string,
  ok: boolean,
  platforms: Array<'mac' | 'lin' | 'win'> = ['mac', 'lin', 'win'],
): TargetAdapter {
  return {
    name,
    platforms,
    async *install() {},
    async *update() {},
    async *teardown() {},
    async verify(_ctx) {
      return ok
        ? { ok: true, adapter: name }
        : { ok: false, adapter: name, missing: [`${name} not installed`] }
    },
    getEnvVars(_ctx) {
      return {}
    },
  } as unknown as TargetAdapter
}

const testCtx: AdapterContext = { platform: 'mac', arch: 'arm64' }

describe('gatherEnvironmentInfo with adapters', () => {
  it('includes adapter name in supportedDevices when verify returns ok', async () => {
    const { gatherEnvironmentInfo } = await import('../../../src/toolbox/doctor/index.js')
    const adapter = makeAdapter('test-ok', true)
    const info = await gatherEnvironmentInfo('1.0.0', { adapterList: [adapter], ctx: testCtx })
    assert.ok(info.supportedDevices.includes('test-ok'))
  })

  it('excludes adapter name from supportedDevices when verify fails', async () => {
    const { gatherEnvironmentInfo } = await import('../../../src/toolbox/doctor/index.js')
    const adapter = makeAdapter('test-fail', false)
    const info = await gatherEnvironmentInfo('1.0.0', { adapterList: [adapter], ctx: testCtx })
    assert.ok(!info.supportedDevices.includes('test-fail'))
  })

  it('skips adapters not supporting current platform', async () => {
    const { gatherEnvironmentInfo } = await import('../../../src/toolbox/doctor/index.js')
    // Adapter only supports 'win', but ctx is 'mac'
    const adapter = makeAdapter('win-only', true, ['win'])
    const info = await gatherEnvironmentInfo('1.0.0', { adapterList: [adapter], ctx: testCtx })
    assert.ok(!info.supportedDevices.includes('win-only'))
  })
})
