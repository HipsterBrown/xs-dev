import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { chdir, cwd } from 'node:process'
import assert from 'node:assert/strict';
import { cleanupTempDir, createTempDir, runWithInputs } from './helpers/runner';
import { app } from '../src/app';

describe('Application', () => {
  afterEach(() => {
    mock.reset();
  })

  describe('default output', () => {
    it('returns help text when called without arguments', async () => {
      const result = await runWithInputs(app, [])
      console.log(result.stdout)
      assert.equal(result.exitCode, 0)
      assert.ok(result.stdout.includes('USAGE'))
      assert.ok(result.stdout.includes('FLAGS'))
      assert.ok(result.stdout.includes('COMMANDS'))
    })
  })

  describe('--version', () => {
    it('should output version information', async () => {
      const result = await runWithInputs(app, ['--version'])

      assert.equal(result.exitCode, 0)
      assert.match(result.stdout, /\d+\.\d+\.\d+/)
    })
  })

  describe('--help', () => {
    it('should output help information', async () => {
      const result = await runWithInputs(app, ['--help'])

      assert.equal(result.exitCode, 0)
      assert.ok(result.stdout.includes('USAGE'))
      assert.ok(result.stdout.includes('FLAGS'))
      assert.ok(result.stdout.includes('COMMANDS'))
    })

    it('should show command help', async () => {
      const result = await runWithInputs(app, ['setup', '--help'])

      assert.equal(result.exitCode, 0)

      assert.ok(result.stdout.includes('USAGE'))
      assert.ok(result.stdout.includes('FLAGS'))
    })
  })

  describe('error handling', () => {
    it('should handle unknown commands gracefully', async () => {
      const result = await runWithInputs(app, ['unknown-command'])

      assert.notEqual(result.exitCode, 0)
      assert.ok(result.stderr.includes('No command registered'))
    })

    it('should handle invalid flags gracefully', async () => {
      const result = await runWithInputs(app, ['setup', '--invalid-flag'])

      assert.notEqual(result.exitCode, 0)
    })

    it('should validate required arguments', async () => {
      const result = await runWithInputs(app, ['init'])

      assert.notEqual(result.exitCode, 0)
      assert.ok(result.stderr.includes('Expected argument for projectName'))
    })
  })

  describe('doctor/info', () => {
    it('should run diagnostic checks', async () => {
      const result = await runWithInputs(app, ['doctor'])

      assert.equal(result.exitCode, 0)
      assert.match(result.stdout, /node|system|platform/i)
    })
  })

  describe('init', () => {
    let tempDir = ''
    const originalDir = cwd()

    beforeEach(async () => {
      tempDir = await createTempDir()
      chdir(tempDir)
    })

    afterEach(async () => {
      chdir(originalDir)
      await cleanupTempDir(tempDir)
    })

    it('should generate new project', async () => {
      const result = await runWithInputs(app, ['init', 'test-project'])
      assert.equal(result.exitCode, 0)
      assert.ok(result.stdout.includes('Run the project'))
    })
  })
})

