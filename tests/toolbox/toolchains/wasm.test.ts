import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

describe('wasmToolchain.getEnvVars', () => {
  it('returns EMSDK', async () => {
    const { wasmToolchain } = await import('../../../src/toolbox/toolchains/wasm.js')
    const result = wasmToolchain.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('EMSDK' in result)
  })

  it('does NOT include EMSDK_NODE (comes from emsdk_env.sh, not getEnvVars)', async () => {
    const { wasmToolchain } = await import('../../../src/toolbox/toolchains/wasm.js')
    const result = wasmToolchain.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok(!('EMSDK_NODE' in result))
  })

  it('does NOT include EMSDK_PYTHON (comes from emsdk_env.sh, not getEnvVars)', async () => {
    const { wasmToolchain } = await import('../../../src/toolbox/toolchains/wasm.js')
    const result = wasmToolchain.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok(!('EMSDK_PYTHON' in result))
  })

  it('returns PATH with binaryen bin', async () => {
    const { wasmToolchain } = await import('../../../src/toolbox/toolchains/wasm.js')
    const result = wasmToolchain.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('PATH' in result)
  })
})

describe('wasmToolchain.verify', () => {
  let savedEmsdk: string | undefined
  let savedEmsdkNode: string | undefined
  let savedEmsdkPython: string | undefined

  beforeEach(() => {
    savedEmsdk = process.env.EMSDK
    savedEmsdkNode = process.env.EMSDK_NODE
    savedEmsdkPython = process.env.EMSDK_PYTHON
  })
  afterEach(() => {
    if (savedEmsdk !== undefined) process.env.EMSDK = savedEmsdk
    else delete process.env.EMSDK
    if (savedEmsdkNode !== undefined) process.env.EMSDK_NODE = savedEmsdkNode
    else delete process.env.EMSDK_NODE
    if (savedEmsdkPython !== undefined) process.env.EMSDK_PYTHON = savedEmsdkPython
    else delete process.env.EMSDK_PYTHON
  })

  it('returns ok: false when EMSDK is not set', async () => {
    delete process.env.EMSDK
    delete process.env.EMSDK_NODE
    delete process.env.EMSDK_PYTHON
    const { wasmToolchain } = await import('../../../src/toolbox/toolchains/wasm.js')
    const result = await wasmToolchain.verify({ platform: 'mac', arch: 'arm64' })
    assert.equal(result.ok, false)
  })
})

describe('wasmToolchain metadata', () => {
  it('has name "wasm"', async () => {
    const { wasmToolchain } = await import('../../../src/toolbox/toolchains/wasm.js')
    assert.equal(wasmToolchain.name, 'wasm')
  })

  it('includes mac and lin in platforms', async () => {
    const { wasmToolchain } = await import('../../../src/toolbox/toolchains/wasm.js')
    assert.ok(wasmToolchain.platforms.includes('mac'))
    assert.ok(wasmToolchain.platforms.includes('lin'))
  })
})
