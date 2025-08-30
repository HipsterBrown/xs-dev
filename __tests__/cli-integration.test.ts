import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'
import { filesystem } from 'gluegun'

const execAsync = promisify(exec)

const CLI_PATH = resolve(__dirname, '..', 'build', 'src', 'cli.js')

/**
 * Execute xs-dev CLI command and return { stdout, stderr, code }
 */
const runCLI = async (command: string, options: { cwd?: string } = {}) => {
  try {
    const { stdout, stderr } = await execAsync(`node "${CLI_PATH}" ${command}`, {
      cwd: options.cwd || process.cwd(),
      timeout: 30000, // 30 second timeout
    })
    return { stdout: stdout.trim(), stderr: stderr.trim(), code: 0 }
  } catch (error: any) {
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || '',
      code: error.code || 1,
    }
  }
}

describe('CLI Integration Tests', () => {
  describe('Basic CLI functionality', () => {
    it('should output version information', async () => {
      const result = await runCLI('--version')

      expect(result.code).toBe(0)
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
    }, 10000)

    it('should display help information', async () => {
      const result = await runCLI('--help')

      expect(result.code).toBe(0)
      expect(result.stdout).toContain('xs-dev')
      expect(result.stdout).toContain('setup')
      expect(result.stdout).toContain('build')
      expect(result.stdout).toContain('run')
    }, 10000)

    it('should show command help', async () => {
      const result = await runCLI('setup --help')

      expect(result.code).toBe(0)
      expect(result.stdout).toContain('setup')
      expect(result.stdout).toContain('device')
    }, 10000)
  })

  describe('Error handling', () => {
    it('should handle unknown commands gracefully', async () => {
      const result = await runCLI('nonexistent-command')

      expect(result.code).not.toBe(0)
      expect(result.stderr || result.stdout).toMatch(/no command registered|unknown|not found|invalid/i)
    }, 10000)

    it('should validate missing required arguments', async () => {
      const result = await runCLI('init') // init requires project name

      expect(result.code).not.toBe(0)
      expect(result.stderr || result.stdout).toMatch(/required|name/i)
    }, 10000)
  })

  describe('Command functionality', () => {
    const tempDir = resolve(__dirname, '..', 'test-project')

    beforeEach(() => {
      // Clean up any previous test artifacts
      filesystem.remove(tempDir)
    })

    afterEach(() => {
      // Clean up test artifacts
      filesystem.remove(tempDir)
    })

    it('should handle init command without MODDABLE env var', async () => {
      const result = await runCLI(`init test-project --typescript`)

      expect(result.code).toBe(0)
    }, 15000)

    it('should handle include command outside of project directory', async () => {
      const result = await runCLI('include base/timer')
      expect(result.code).not.toBe(0)
      expect(result.stderr || result.stdout).toMatch(/manifest\.json.*not found|project directory/i)
    }, 10000)

    it('should handle remove command outside of project directory', async () => {
      const result = await runCLI('remove timer')

      expect(result.code).not.toBe(0)
      expect(result.stderr || result.stdout).toMatch(/manifest\.json.*not found|project directory/i)
    }, 10000)

    it('should handle setup command gracefully when dependencies missing', async () => {
      const result = await runCLI('setup --device wasm')

      // Should either succeed or provide helpful error messages
      // Since we don't have Moddable SDK installed in test environment,
      // it should fail gracefully with a helpful message
      expect(result.code).not.toBe(0)
      expect(result.stderr || result.stdout).toMatch(/moddable|required|setup|tooling/i)
    }, 20000)

    it('should show device help information', async () => {
      const result = await runCLI('setup --help')

      // Should mention device options in help
      expect(result.stdout || result.stderr).toMatch(/device|esp32|esp8266|wasm|pico/i)
    }, 10000)
  })

  describe('Doctor command', () => {
    it('should run diagnostic checks', async () => {
      const result = await runCLI('doctor')

      expect(result.code).toBe(0)
      expect(result.stdout).toMatch(/node|system|platform/i)
    }, 15000)
  })

  describe('Edge cases and error conditions', () => {
    it('should handle invalid flags gracefully', async () => {
      const result = await runCLI('setup --invalid-flag')

      expect(result.code).not.toBe(0)
    }, 10000)

    it('should handle empty arguments appropriately', async () => {
      const result = await runCLI('')

      // Should show help or error message
      expect(result.stdout || result.stderr).toMatch(/help|usage|command/i)
    }, 10000)
  })
})
