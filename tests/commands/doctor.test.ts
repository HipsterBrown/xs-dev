import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runWithInputs } from '../helpers/runner'
import { app } from '../../src/app'

describe('doctor command', () => {
  it('includes two-tier dependency sections in output', async () => {
    const result = await runWithInputs(app, ['doctor'])

    assert.equal(result.exitCode, 0)
    assert.ok(
      result.stdout.includes('System dependencies'),
      `Expected "System dependencies" in output, got:\n${result.stdout}`,
    )
    assert.ok(
      result.stdout.includes('Platform dependencies'),
      `Expected "Platform dependencies" in output, got:\n${result.stdout}`,
    )
    // Verify the format includes dependency info
    assert.ok(result.stdout.includes('(expected'), 'Expected dependency format with "expected"')
    // Verify we have at least one dependency listed
    assert.ok(/[✔✘]/.test(result.stdout), 'Expected health check mark (✔ or ✘) in output')
  })
})
