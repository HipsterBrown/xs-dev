import { mock } from 'node:test'
import { tmpdir } from 'node:os'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { run } from '@stricli/core'

export function buildFakeContext(options: { env?: Record<string, string> } = {}) {
  let exitCode: number | undefined
  const context = {
    process: {
      stdout: {
        write: mock.fn(),
      },
      stderr: {
        write: mock.fn(),
      },
      env: options.env ?? {},
      exit: (code: number) => {
        exitCode = code
      },
      exitCode: () => exitCode,
    },
    currentVersion: 'test',
  }
  return context
}

export async function runWithInputs(app: unknown, inputs: string[], ...args: Parameters<typeof buildFakeContext>) {
  const context = buildFakeContext(...args)
  await run(app as any, inputs, context as any)
  const stdout = context.process.stdout.write.mock.calls?.[0]?.arguments?.join('') ?? ''
  return {
    stdout,
    stderr: context.process.stderr.write.mock.calls?.[0]?.arguments?.join('') ?? '',
    exitCode: context.process.exitCode(),
  }
}

export async function createTempDir() {
  return await mkdtemp(join(tmpdir(), 'xs-dev-test-'))
}

export async function cleanupTempDir(dir) {
  await rm(dir, { recursive: true, force: true })
}
