import { afterEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { isSuccess, isFailure } from '#src/toolbox/system/errors.js'

describe('toolbox/system/exec', async () => {
  mock.module('execa', {
    namedExports: {
      execaCommand: mock.fn(),
      execa: mock.fn(),
    }
  })
  const { execaCommand, execa } = await import('execa')

  afterEach(() => {
    execaCommand.mock.resetCalls()
    execa.mock.resetCalls()
  })

  describe('execWithSudo', async () => {
    const { execWithSudo } = await import('#src/toolbox/system/exec.js')

    it('should succeed with non-interactive sudo', async () => {
      execaCommand.mock.mockImplementationOnce(async () => ({ stdout: 'success' }))
      const result = await execWithSudo('test command')

      assert.ok(isSuccess(result))
      assert.equal(execaCommand.mock.calls[0].arguments[0], 'sudo --non-interactive --preserve-env test command')
    })

    it('should fail with non-password errors', async () => {
      execaCommand.mock.mockImplementationOnce(async () => { throw new Error('permission denied') })

      const result = await execWithSudo('test command')

      assert.ok(isFailure(result))
      assert.ok(result.error.includes('Failed to execute sudo command'))
    })

    it('should pass through options', async () => {
      execaCommand.mock.mockImplementationOnce(async () => ({ stdout: 'success' }))

      const options = { stdout: 'pipe' }
      await execWithSudo('test command', options)

      assert.deepEqual(execaCommand.mock.calls[0].arguments, ['sudo --non-interactive --preserve-env test command', options])
    })
  })

  describe('pkexec', async () => {
    const { pkexec } = await import('#src/toolbox/system/exec.js')
    it('should execute command with pkexec', async () => {
      execaCommand.mock.mockImplementationOnce(async () => ({ stdout: 'success' }))

      const result = await pkexec('test command')

      assert.ok(isSuccess(result))
      assert.equal(execaCommand.mock.calls[0].arguments[0], 'pkexec test command')
    })

    it('should handle pkexec failures', async () => {
      execaCommand.mock.mockImplementationOnce(async () => { throw new Error('pkexec failed') })

      const result = await pkexec('test command')

      assert.ok(isFailure(result))
    })

    it('should pass through options', async () => {
      execaCommand.mock.mockImplementationOnce(async () => ({ stdout: 'success' }))

      const options = { cwd: '/tmp' }
      await pkexec('test command', options)

      assert.deepEqual(execaCommand.mock.calls[0].arguments, ['pkexec test command', options])
    })
  })

  describe('sourceEnvironment', async () => {
    const { sourceEnvironment } = await import('#src/toolbox/system/exec.js')

    it('should call system.spawn with correct command', async () => {
      execa.mock.mockImplementationOnce(async () => ({
        stdout: 'PATH=/usr/bin:/bin\nHOME=/home/user\n',
      }))

      const result = await sourceEnvironment()

      assert.ok(isSuccess(result))
      assert.equal(execa.mock.callCount(), 1)
    })

    it('should handle spawn errors', async () => {
      execa.mock.mockImplementationOnce(async () => { throw new Error('spawn failed') })

      const result = await sourceEnvironment()

      assert.ok(isFailure(result))
    })
  })

  describe('sourceIdf', async () => {
    const { sourceIdf } = await import('#src/toolbox/system/exec.js')

    it('should call system.spawn with IDF export command', async () => {
      execa.mock.mockImplementationOnce(async () => ({
        stdout: 'PATH=/esp/bin:/usr/bin\nIDF_PATH=/esp/esp-idf\n',
      }))

      const result = await sourceIdf()

      assert.ok(isSuccess(result))
      assert.equal(execa.mock.callCount(), 1)
    })
  })

  describe('sourceIdfPythonEnv', async () => {
    const { sourceIdfPythonEnv } = await import('#src/toolbox/system/exec.js')

    it('should call system.spawn with Python environment activation', async () => {
      process.env.IDF_PYTHON_ENV_PATH = '/path/to/python/env'

      execa.mock.mockImplementationOnce(async () => ({
        stdout: 'PATH=/python/env/bin:/usr/bin\nVIRTUAL_ENV=/python/env\n',
      }))

      const result = await sourceIdfPythonEnv()

      assert.ok(isSuccess(result))
      assert.equal(execa.mock.callCount(), 1)
    })
  })
})
