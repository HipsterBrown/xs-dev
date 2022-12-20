import { type as platformType } from 'os'
import { finished } from 'stream'
import { promisify } from 'util'
import { filesystem } from 'gluegun'
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
    releaseTools === 'dir' &&
    debugTools === 'dir'
  )
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
    throw new Error(`Unable to find release asset matching ${assetName}`)
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
