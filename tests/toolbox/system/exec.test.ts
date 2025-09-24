import { afterEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { isSuccess, isFailure } from '#src/toolbox/system/errors'

describe('toolbox/system/exec', async () => {
  mock.module('gluegun', {
    namedExports: {
      system: {
        which: mock.fn(),
        exec: mock.fn(),
        spawn: mock.fn(),
      },
      filesystem: {
        homedir: mock.fn(() => '/home/user'),
        resolve: mock.fn((...paths) => paths.join('/'))
      }
    }
  })
  const { system } = await import('gluegun')

  afterEach(() => {
    system.exec.mock.resetCalls()
    system.which.mock.resetCalls()
    system.spawn.mock.resetCalls()
  })

  describe('execWithSudo', async () => {
    const { execWithSudo } = await import('#src/toolbox/system/exec.js')

    it('should succeed with non-interactive sudo', async () => {
      system.exec.mock.mockImplementationOnce(async () => 'success')
      const result = await execWithSudo('test command')

      assert.ok(isSuccess(result))
      assert.deepEqual(system.exec.mock.calls[0].arguments, ['sudo --non-interactive --preserve-env test command', {}])
    })

    it('should fall back to askpass when password is required', async () => {
      system.exec.mock.mockImplementationOnce(async () => { throw new Error('password required') })
      system.which.mock.mockImplementationOnce(() => '/usr/bin/ssh-askpass')

      const result = await execWithSudo('test command')

      assert.ok(isSuccess(result))
      assert.equal(system.exec.mock.callCount(), 2)
      assert.deepEqual(system.exec.mock.calls[0].arguments, ['sudo --non-interactive --preserve-env test command', {}])
      assert.deepEqual(system.exec.mock.calls[1].arguments, ['sudo --askpass --preserve-env test command', {}])
      assert.equal(process.env.SUDO_ASKPASS, '/usr/bin/ssh-askpass')
    })

    it('should fail when ssh-askpass is not available', async () => {
      system.exec.mock.mockImplementationOnce(async () => { throw new Error('password required') })
      system.which.mock.mockImplementationOnce(() => undefined)

      const result = await execWithSudo('test command')

      assert.ok(isFailure(result))
      assert.equal(result.error, 'ssh-askpass required to prompt for password')
    })

    it('should fail with non-password errors', async () => {
      system.exec.mock.mockImplementationOnce(async () => { throw new Error('permission denied') })

      const result = await execWithSudo('test command')

      assert.ok(isFailure(result))
      assert.equal(result.error, 'Failed to execute sudo command: Error: permission denied')
    })

    it('should pass through options', async () => {
      system.exec.mock.mockImplementationOnce(async () => 'success')

      const options = { stdout: 'pipe' }
      await execWithSudo('test command', options)

      assert.deepEqual(system.exec.mock.calls[0].arguments, ['sudo --non-interactive --preserve-env test command', options])
    })
  })

  describe('pkexec', async () => {
    const { pkexec } = await import('#src/toolbox/system/exec.js')
    it('should execute command with pkexec', async () => {
      system.exec.mock.mockImplementationOnce(async () => 'success')

      const result = await pkexec('test command')

      assert.ok(isSuccess(result))
      assert.deepEqual(system.exec.mock.calls[0].arguments, ['pkexec test command', {}])
    })

    it('should handle pkexec failures', async () => {
      system.exec.mock.mockImplementationOnce(async () => { throw new Error('pkexec failed') })

      const result = await pkexec('test command')

      assert.ok(isFailure(result))
    })

    it('should pass through options', async () => {
      system.exec.mock.mockImplementationOnce(async () => 'success')

      const options = { cwd: '/tmp' }
      await pkexec('test command', options)

      assert.deepEqual(system.exec.mock.calls[0].arguments, ['pkexec test command', options])
    })
  })

  describe('sourceEnvironment', async () => {
    const { sourceEnvironment } = await import('#src/toolbox/system/exec.js')

    it('should call system.spawn with correct command', async () => {
      system.spawn.mock.mockImplementationOnce(async () => ({
        stdout: 'PATH=/usr/bin:/bin\nHOME=/home/user\n',
      }))

      const result = await sourceEnvironment()

      assert.ok(isSuccess(result))
      assert.equal(system.spawn.mock.callCount(), 1)
    })

    it('should handle spawn errors', async () => {
      system.spawn.mock.mockImplementationOnce(async () => { throw new Error('spawn failed') })

      const result = await sourceEnvironment()

      assert.ok(isFailure(result))
    })
  })

  describe('sourceIdf', async () => {
    const { sourceIdf } = await import('#src/toolbox/system/exec.js')

    it('should call system.spawn with IDF export command', async () => {
      system.spawn.mock.mockImplementationOnce(async () => ({
        stdout: 'PATH=/esp/bin:/usr/bin\nIDF_PATH=/esp/esp-idf\n',
      }))

      const result = await sourceIdf()

      assert.ok(isSuccess(result))
      assert.deepEqual(system.spawn.mock.calls[0].arguments, ['source $IDF_PATH/export.sh 1> /dev/null && env', { shell: process.env.SHELL }])
    })
  })

  describe('sourceIdfPythonEnv', async () => {
    const { sourceIdfPythonEnv } = await import('#src/toolbox/system/exec.js')

    it('should call system.spawn with Python environment activation', async () => {
      process.env.IDF_PYTHON_ENV_PATH = '/path/to/python/env'

      system.spawn.mock.mockImplementationOnce(async () => ({
        stdout: 'PATH=/python/env/bin:/usr/bin\nVIRTUAL_ENV=/python/env\n',
      }))

      const result = await sourceIdfPythonEnv()

      assert.ok(isSuccess(result))
      assert.deepEqual(system.spawn.mock.calls[0].arguments, ['source /path/to/python/env/bin/activate && env', { shell: process.env.SHELL }])
    })
  })
})

