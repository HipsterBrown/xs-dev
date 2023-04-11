export interface SetupArgs {
  targetBranch: 'public' | 'latest-release' | string
}

export interface PlatformSetupArgs extends SetupArgs {
  sourceRepo: string;
}
