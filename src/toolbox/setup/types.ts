export interface SetupArgs {
  branch: 'public' | string
  release: 'latest' | string
}

export interface PlatformSetupArgs extends SetupArgs {
  sourceRepo: string
}
