export interface SetupArgs {
  branch: 'public' | string
  release: 'latest' | string
  interactive: boolean
}

export interface PlatformSetupArgs extends SetupArgs {
  sourceRepo: string
}
