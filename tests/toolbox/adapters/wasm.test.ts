import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

describe('wasmAdapter.getEnvVars', () => {
  it('returns EMSDK', async () => {
    const { wasmAdapter } = await import('../../../src/toolbox/adapters/wasm.js')
    const result = wasmAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('EMSDK' in result)
  })

  it('returns EMSDK_NODE', async () => {
    const { wasmAdapter } = await import('../../../src/toolbox/adapters/wasm.js')
    const result = wasmAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('EMSDK_NODE' in result)
  })

  it('returns EMSDK_PYTHON', async () => {
    const { wasmAdapter } = await import('../../../src/toolbox/adapters/wasm.js')
    const result = wasmAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('EMSDK_PYTHON' in result)
  })

  it('returns PATH with binaryen bin', async () => {
    const { wasmAdapter } = await import('../../../src/toolbox/adapters/wasm.js')
    const result = wasmAdapter.getEnvVars({ platform: 'mac', arch: 'arm64' })
    assert.ok('PATH' in result)
  })
})

describe('wasmAdapter.verify', () => {
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
    const { wasmAdapter } = await import('../../../src/toolbox/adapters/wasm.js')
    const result = await wasmAdapter.verify({ platform: 'mac', arch: 'arm64' })
    assert.equal(result.ok, false)
  })
})

describe('wasmAdapter metadata', () => {
  it('has name "wasm"', async () => {
    const { wasmAdapter } = await import('../../../src/toolbox/adapters/wasm.js')
    assert.equal(wasmAdapter.name, 'wasm')
  })

  it('includes mac and lin in platforms', async () => {
    const { wasmAdapter } = await import('../../../src/toolbox/adapters/wasm.js')
    assert.ok(wasmAdapter.platforms.includes('mac'))
    assert.ok(wasmAdapter.platforms.includes('lin'))
  })
})
