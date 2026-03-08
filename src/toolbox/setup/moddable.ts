import { type as platformType } from 'node:os'
import { finished } from 'node:stream'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { execaCommand } from '../system/execa.js'
import { Octokit, type RestEndpointMethodTypes } from '@octokit/rest'
import { Extract as ZipExtract } from 'unzip-stream'
import { INSTALL_PATH } from './constants'
import type { Device } from '../../types'
import { DEVICE_ALIAS } from '../prompt/devices'
import { fetchStream } from '../system/fetch'

const finishedPromise = promisify(finished)

export function moddableExists(): boolean {
  const OS = platformType().toLowerCase() as Device
  const platformDir = DEVICE_ALIAS[OS].substring(0, 3)
  const releaseToolsPath = resolve(INSTALL_PATH, 'build', 'bin', platformDir, 'release')
  const debugToolsPath = resolve(INSTALL_PATH, 'build', 'bin', platformDir, 'debug')

  const releaseTools = existsSync(releaseToolsPath)
  const debugTools = existsSync(debugToolsPath)

  return (
    process.env.MODDABLE !== undefined &&
    existsSync(process.env.MODDABLE) &&
    (releaseTools || debugTools)
  )
}

function isGitRepo(path: string): boolean {
  return existsSync(resolve(path, '.git'))
}

export async function getModdableVersion(): Promise<string | null> {
  if (!moddableExists() || !isGitRepo(process.env.MODDABLE ?? '')) {
    return null
  }

  try {
    const tagsResult = await execaCommand('git tag -l --sort=-taggerdate', {
      cwd: process.env.MODDABLE,
    })
    const tag = tagsResult.stdout.split('\n').shift()

    const latestCommitResult = await execaCommand('git rev-parse HEAD', {
      cwd: process.env.MODDABLE,
    })
    const latestCommit = latestCommitResult.stdout

    if (tag !== undefined && tag.length > 0) {
      const tagCommitResult = await execaCommand(`git rev-list -n 1 ${tag}`, {
        cwd: process.env.MODDABLE,
      })
      if (tagCommitResult.stdout === latestCommit) return tag
    }

    const currentBranchResult = await execaCommand('git branch --show-current', {
      cwd: process.env.MODDABLE,
    })
    return `branch: ${currentBranchResult.stdout.trim()}, commit: ${latestCommit}`
  } catch {
    return null
  }
}

type ExtractFromArray<Item extends readonly unknown[]> =
  Item extends Readonly<Array<infer ItemType>> ? ItemType : never
type GitHubRelease = ExtractFromArray<
  RestEndpointMethodTypes['repos']['listReleases']['response']['data']
>

export async function fetchRelease(
  release: 'latest' | string,
): Promise<GitHubRelease | null> {
  try {
    const octokit = new Octokit()
    if (release === 'latest') {
      const { data: latestRelease } = await octokit.rest.repos.getLatestRelease({
        owner: 'Moddable-OpenSource',
        repo: 'moddable',
      })
      return latestRelease
    } else {
      const { data: taggedRelease } = await octokit.rest.repos.getReleaseByTag({
        owner: 'Moddable-OpenSource',
        repo: 'moddable',
        tag: release,
      })
      return taggedRelease
    }
  } catch {
    return null
  }
}

export class MissingReleaseAssetError extends Error {
  constructor(assetName: string) {
    super(`Unable to find release asset matching ${assetName}`)
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
    throw new MissingReleaseAssetError(assetName)
  }

  const zipWriter = ZipExtract({
    path: writePath,
  })
  const download = await fetchStream(moddableTools.browser_download_url)
  download.pipe(zipWriter)
  await finishedPromise(zipWriter)
}
