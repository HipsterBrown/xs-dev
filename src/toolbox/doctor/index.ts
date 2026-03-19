import os from 'node:os'
import { which } from '../system/exec.js'
import { getModdableVersion } from '../setup/moddable.js'
import { detectPython, getPythonVersion } from '../system/python.js'
import { unwrapOr } from '../system/errors.js'
import type { Toolchain, HostContext } from '../../lib/toolchain.js'

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
  { adapterList, ctx }: { adapterList: Toolchain[]; ctx: HostContext },
): Promise<EnvironmentInfo> {
  const supportedDevices: string[] = []

  await Promise.all(
    adapterList
      .filter((toolchain) => toolchain.platforms.includes(ctx.platform))
      .map(async (toolchain) => {
        Object.assign(process.env, toolchain.getEnvVars(ctx))
        const result = await toolchain.verify(ctx)
        if (result.ok) {
          supportedDevices.push(toolchain.name)
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
