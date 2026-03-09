// Dynamic import wrapper for execa (ESM-only package)
// Project is not yet migrated to ESM, so static imports of execa fail in CJS context.
// See: https://github.com/sindresorhus/execa/issues/1159

import type { Options, Result } from 'execa'

const execaPromise = import('execa')

export async function execaCommand(command: string, options?: Options): Promise<Result> {
  const { execaCommand: fn } = await execaPromise
  return await fn(command, options) as Result
}

export async function execa(file: string, args?: string[], options?: Options): Promise<Result> {
  const { execa: fn } = await execaPromise
  return await fn(file, args, options) as Result
}
