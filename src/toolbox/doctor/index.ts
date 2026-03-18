import os from 'node:os'
import { which } from '../system/exec.js'
import { getModdableVersion } from '../setup/moddable.js'
import { detectPython, getPythonVersion } from '../system/python.js'
import { unwrapOr } from '../system/errors.js'
import type { TargetAdapter, AdapterContext } from '../../lib/adapter.js'

export interface EnvironmentInfo {
  cliVersion: string
  osType: string
  arch: string
  shell: string
  nodeVersion: string
  nodePath: string
  pythonVersion: string
  pythonPath: string
  moddableVersion: string
  moddablePath: string
  supportedDevices: string[]
}

export async function gatherEnvironmentInfo(
  cliVersion: string,
  { adapterList, ctx }: { adapterList: TargetAdapter[]; ctx: AdapterContext },
): Promise<EnvironmentInfo> {
  const supportedDevices: string[] = []

  await Promise.all(
    adapterList
      .filter((adapter) => adapter.platforms.includes(ctx.platform))
      .map(async (adapter) => {
        Object.assign(process.env, adapter.getEnvVars(ctx))
        const result = await adapter.verify(ctx)
        if (result.ok) {
          supportedDevices.push(adapter.name)
        }
      }),
  )

  const pythonVersion = unwrapOr(await getPythonVersion(), 'Unavailable')
  const pythonPath = which(detectPython() ?? '') ?? 'n/a'
  const moddableVersion = unwrapOr(await getModdableVersion(), 'Not found')
  const moddablePath = process.env.MODDABLE ?? 'n/a'

  return {
    cliVersion,
    osType: os.type(),
    arch: os.arch(),
    shell: process.env.SHELL ?? 'Unknown',
    nodeVersion: process.version,
    nodePath: which('node') ?? 'path not found',
    pythonVersion,
    pythonPath,
    moddableVersion,
    moddablePath,
    supportedDevices,
  }
}
