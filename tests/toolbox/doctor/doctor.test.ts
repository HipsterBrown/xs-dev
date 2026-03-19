import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Toolchain, HostContext } from '../../../src/lib/toolchain.js'

function makeToolchain(
  name: string,
  ok: boolean,
  platforms: Array<'mac' | 'lin' | 'win'> = ['mac', 'lin', 'win'],
): Toolchain {
  return {
    name,
    platforms,
    async *install() { },
    async *update() { },
    async *teardown() { },
    async verify(_ctx) {
      return ok
        ? { ok: true, toolchain: name }
        : { ok: false, toolchain: name, missing: [`${name} not installed`] }
    },
    getEnvVars(_ctx) {
      return {}
    },
  } as unknown as Toolchain
}

const testCtx: HostContext = { platform: 'mac', arch: 'arm64' }

describe('gatherEnvironmentInfo with toolchains', () => {
  it('includes toolchain name in supportedDevices when verify returns ok', async () => {
    const { gatherEnvironmentInfo } = await import('#src/toolbox/doctor/index.js')
    const toolchain = makeToolchain('test-ok', true)
    const info = await gatherEnvironmentInfo('1.0.0', { toolchains: [toolchain], ctx: testCtx })
    assert.ok(info.supportedDevices.includes('test-ok'))
  })

  it('excludes toolchain name from supportedDevices when verify fails', async () => {
    const { gatherEnvironmentInfo } = await import('#src/toolbox/doctor/index.js')
    const toolchain = makeToolchain('test-fail', false)
    const info = await gatherEnvironmentInfo('1.0.0', { toolchains: [toolchain], ctx: testCtx })
    assert.ok(!info.supportedDevices.includes('test-fail'))
  })

  it('skips toolchains not supporting current platform', async () => {
    const { gatherEnvironmentInfo } = await import('#src/toolbox/doctor/index.js')
    // toolchain only supports 'win', but ctx is 'mac'
    const toolchain = makeToolchain('win-only', true, ['win'])
    const info = await gatherEnvironmentInfo('1.0.0', { toolchains: [toolchain], ctx: testCtx })
    assert.ok(!info.supportedDevices.includes('win-only'))
  })
})
