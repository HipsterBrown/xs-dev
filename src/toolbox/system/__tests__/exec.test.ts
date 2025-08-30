import { system } from 'gluegun'
import {
  execWithSudo,
  pkexec,
  sourceEnvironment,
  sourceIdf,
  sourceIdfPythonEnv,
} from '../exec'
import { isSuccess, isFailure } from '../errors'

// Mock gluegun system
jest.mock('gluegun', () => ({
  system: {
    which: jest.fn(),
    exec: jest.fn(),
    spawn: jest.fn(),
  },
  filesystem: {
    homedir: jest.fn(() => '/home/user'),
    resolve: jest.fn((...paths: string[]) => paths.join('/')),
  },
}))

// Mock the constants file to avoid filesystem dependency issues
jest.mock('../../setup/constants', () => ({
  EXPORTS_FILE_PATH: '/home/user/.local/share/xs-dev-exports.sh',
}))

const mockSystem = system as jest.Mocked<typeof system>

describe('Exec Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment
    delete process.env.SUDO_ASKPASS
  })

  describe('execWithSudo', () => {
    it('should succeed with non-interactive sudo', async () => {
      mockSystem.exec.mockResolvedValueOnce('success')
      
      const result = await execWithSudo('test command')
      
      expect(isSuccess(result)).toBe(true)
      expect(mockSystem.exec).toHaveBeenCalledWith(
        'sudo --non-interactive --preserve-env test command',
        {}
      )
    })

    it('should fall back to askpass when password is required', async () => {
      // First call fails with password error
      mockSystem.exec
        .mockRejectedValueOnce(new Error('password required'))
        .mockResolvedValueOnce('success with askpass')
      
      // Mock ssh-askpass being available
      mockSystem.which.mockReturnValue('/usr/bin/ssh-askpass')
      
      const result = await execWithSudo('test command')
      
      expect(isSuccess(result)).toBe(true)
      expect(mockSystem.exec).toHaveBeenCalledTimes(2)
      expect(mockSystem.exec).toHaveBeenNthCalledWith(1,
        'sudo --non-interactive --preserve-env test command',
        {}
      )
      expect(mockSystem.exec).toHaveBeenNthCalledWith(2,
        'sudo --askpass --preserve-env test command',
        {}
      )
      expect(process.env.SUDO_ASKPASS).toBe('/usr/bin/ssh-askpass')
    })

    it('should fail when ssh-askpass is not available', async () => {
      mockSystem.exec.mockRejectedValueOnce(new Error('password required'))
      mockSystem.which.mockReturnValue(undefined)
      
      const result = await execWithSudo('test command')
      
      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error).toBe('ssh-askpass required to prompt for password')
      }
    })

    it('should fail with non-password errors', async () => {
      mockSystem.exec.mockRejectedValueOnce(new Error('permission denied'))
      
      const result = await execWithSudo('test command')
      
      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error).toContain('Failed to execute sudo command')
      }
    })

    it('should pass through options', async () => {
      mockSystem.exec.mockResolvedValueOnce('success')
      
      const options = { stdout: 'pipe' }
      await execWithSudo('test command', options)
      
      expect(mockSystem.exec).toHaveBeenCalledWith(
        'sudo --non-interactive --preserve-env test command',
        options
      )
    })
  })

  describe('pkexec', () => {
    it('should execute command with pkexec', async () => {
      mockSystem.exec.mockResolvedValueOnce('success')
      
      const result = await pkexec('test command')
      
      expect(isSuccess(result)).toBe(true)
      expect(mockSystem.exec).toHaveBeenCalledWith('pkexec test command', {})
    })

    it('should handle pkexec failures', async () => {
      mockSystem.exec.mockRejectedValueOnce(new Error('pkexec failed'))
      
      const result = await pkexec('test command')
      
      expect(isFailure(result)).toBe(true)
    })

    it('should pass through options', async () => {
      mockSystem.exec.mockResolvedValueOnce('success')
      
      const options = { cwd: '/tmp' }
      await pkexec('test command', options)
      
      expect(mockSystem.exec).toHaveBeenCalledWith('pkexec test command', options)
    })
  })

  describe('sourceEnvironment', () => {
    it('should call system.spawn with correct command', async () => {
      mockSystem.spawn.mockResolvedValueOnce({
        stdout: 'PATH=/usr/bin:/bin\nHOME=/home/user\n',
      })
      
      const result = await sourceEnvironment()
      
      expect(isSuccess(result)).toBe(true)
      expect(mockSystem.spawn).toHaveBeenCalled()
    })

    it('should handle spawn errors', async () => {
      mockSystem.spawn.mockRejectedValueOnce(new Error('spawn failed'))
      
      const result = await sourceEnvironment()
      
      expect(isFailure(result)).toBe(true)
    })
  })

  describe('sourceIdf', () => {
    it('should call system.spawn with IDF export command', async () => {
      mockSystem.spawn.mockResolvedValueOnce({
        stdout: 'PATH=/esp/bin:/usr/bin\nIDF_PATH=/esp/esp-idf\n',
      })
      
      const result = await sourceIdf()
      
      expect(isSuccess(result)).toBe(true)
      expect(mockSystem.spawn).toHaveBeenCalledWith(
        'source $IDF_PATH/export.sh 1> /dev/null && env',
        { shell: process.env.SHELL }
      )
    })
  })

  describe('sourceIdfPythonEnv', () => {
    it('should call system.spawn with Python environment activation', async () => {
      process.env.IDF_PYTHON_ENV_PATH = '/path/to/python/env'
      
      mockSystem.spawn.mockResolvedValueOnce({
        stdout: 'PATH=/python/env/bin:/usr/bin\nVIRTUAL_ENV=/python/env\n',
      })
      
      const result = await sourceIdfPythonEnv()
      
      expect(isSuccess(result)).toBe(true)
      expect(mockSystem.spawn).toHaveBeenCalledWith(
        'source /path/to/python/env/bin/activate && env',
        { shell: process.env.SHELL }
      )
    })
  })
})