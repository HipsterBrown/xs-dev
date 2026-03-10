import { execa as execaFn, execaCommand as execaCommandFn } from 'execa'
import type { Options, Result } from 'execa'

export async function execaCommand(command: string, options?: Options): Promise<Result> {
  return await execaCommandFn(command, options) as Result
}

export async function execa(file: string, args?: string[], options?: Options): Promise<Result> {
  return await execaFn(file, args, options) as Result
}
