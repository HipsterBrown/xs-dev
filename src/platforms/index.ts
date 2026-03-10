import type { PlatformTarget } from './target.js'

const PLATFORM_LOADERS: Record<string, () => Promise<PlatformTarget>> = {
  esp32: async () => {
    const { Esp32Platform } = await import('./esp32/index.js')
    return await Esp32Platform.load()
  },
}

export function listPlatforms(): string[] {
  return Object.keys(PLATFORM_LOADERS)
}

export async function getPlatform(name: string): Promise<PlatformTarget | null> {
  const loader = PLATFORM_LOADERS[name]
  if (loader === undefined) {
    return null
  }
  return await loader()
}
