import { type as platformType } from 'os'
import { finished } from 'stream'
import { promisify } from 'util'
import { filesystem, system } from 'gluegun'
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest'
import { Extract as ZipExtract } from 'unzip-stream'
import axios from 'axios'
import { INSTALL_PATH } from './constants'
import { Device } from '../../types'
import { DEVICE_ALIAS } from '../prompt/devices'

const finishedPromise = promisify(finished)

export function moddableExists(): boolean {
  const OS = platformType().toLowerCase() as Device
  const platformDir = DEVICE_ALIAS[OS]
  const releaseTools = filesystem.exists(
    filesystem.resolve(
      INSTALL_PATH,
      'build',
      'bin',
      platformDir,
      'release'
    )
  )
  const debugTools = filesystem.exists(
    filesystem.resolve(
      INSTALL_PATH,
      'build',
      'bin',
      platformDir,
      'debug'
    )
  )
  return (
    process.env.MODDABLE !== undefined &&
    filesystem.exists(process.env.MODDABLE) === 'dir' &&
    (releaseTools === 'dir' || debugTools === 'dir')
  )
}

export async function getModdableVersion(): Promise<string | null> {
  if (moddableExists()) {
    const tags = await system.run('git tag -l --sort=-taggerdate', { cwd: process.env.MODDABLE })
    const tag = tags.split('\n').shift()
    const latestCommit = await system.run(`git rev-parse HEAD`, { cwd: process.env.MODDABLE })

    if (tag !== undefined && tag.length > 0) {
      const tagCommit = await system.run(`git rev-list -n 1 ${tag}`, { cwd: process.env.MODDABLE })
      if (tagCommit === latestCommit) return tag
    }

    const currentBranch = await system.run(`git branch --show-current`, { cwd: process.env.MODDABLE })
    return `branch: ${currentBranch.trim()}, commit: ${latestCommit}`
  }
  return null;
}

type ExtractFromArray<Item extends readonly unknown[]> = Item extends Readonly<
  Array<infer ItemType>
>
  ? ItemType
  : never
type GitHubRelease = ExtractFromArray<
  RestEndpointMethodTypes['repos']['listReleases']['response']['data']
>

export async function fetchLatestRelease(): Promise<GitHubRelease> {
  const octokit = new Octokit()
  const { data: latestRelease } = await octokit.rest.repos.getLatestRelease({
    owner: 'Moddable-OpenSource',
    repo: 'moddable',
  })
  return latestRelease
}

export class MissingReleaseAssetError extends Error {
  constructor(assetName: string) {
    super(`Unabled to find release asset matching ${assetName}`);
  }
}

interface DownloadToolsArgs {
  writePath: string
  assetName: string
  release: GitHubRelease
}

export async function downloadReleaseTools({
  writePath,
  assetName,
  release,
}: DownloadToolsArgs): Promise<void> {
  const moddableTools = release.assets.find(({ name }) => name === assetName)

  if (moddableTools === undefined) {
    throw new MissingReleaseAssetError(assetName);
  }

  const zipWriter = ZipExtract({
    path: writePath,
  })
  const response = await axios.get(moddableTools.browser_download_url, {
    responseType: 'stream',
  })
  response.data.pipe(zipWriter)
  await finishedPromise(zipWriter)
}
