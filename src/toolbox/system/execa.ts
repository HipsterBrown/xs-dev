import type { Options, Result } from 'execa'

// Dynamic import is intentional: tsx's experimental module mocking intercepts
// import() at the call site, allowing tests to replace execa. Static top-level
// imports are resolved before mocks are registered.
const execaPromise = import('execa')

export async function execaCommand(command: string, options?: Options): Promise<Result> {
  const { execaCommand: fn } = await execaPromise
  return await fn(command, options) as Result
}

export async function execa(file: string, args?: string[], options?: Options): Promise<Result> {
  const { execa: fn } = await execaPromise
  return await fn(file, args, options) as Result
}
