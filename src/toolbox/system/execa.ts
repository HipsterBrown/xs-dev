// Dynamic import wrapper for execa (ESM-only package)
// Project is not yet migrated to ESM, so static imports of execa fail in CJS context.
// See: https://github.com/sindresorhus/execa/issues/1159

const execaPromise = import('execa')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function execaCommand(command: string, options?: Record<string, unknown>): Promise<any> {
  const { execaCommand: fn } = await execaPromise
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fn(command, options as any)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function execa(file: string, args?: string[], options?: Record<string, unknown>): Promise<any> {
  const { execa: fn } = await execaPromise
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fn(file, args, options as any)
}
