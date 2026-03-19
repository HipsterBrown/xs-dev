import { arch as osArch, type as osType } from 'node:os'
import type { HostContext, HostPlatform } from './interface.js'

function detectPlatform(): HostPlatform {
  const t = osType().toLowerCase()
  if (t === 'darwin') return 'mac'
  if (t === 'linux') return 'lin'
  return 'win'
}

function detectArch(): 'x64' | 'arm64' {
  return osArch() === 'arm64' ? 'arm64' : 'x64'
}

export function getHostContext(): HostContext {
  return {
    platform: detectPlatform(),
    arch: detectArch(),
  }
}
