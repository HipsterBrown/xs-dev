import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

describe('toolbox/setup/moddable', async () => {
  mock.module('execa', {
    namedExports: {
      execaCommand: mock.fn(async () => ({ stdout: 'v0.5.0' })),
    }
  })
  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => true),
    }
  })
  mock.module('@octokit/rest', {
    namedExports: {
      Octokit: mock.fn(() => ({
        rest: {
          repos: {
            getLatestRelease: mock.fn(async () => ({
              data: {
                tag_name: 'v0.5.0',
                assets: [
                  {
                    name: 'moddable-tools-macuniversal.zip',
                    browser_download_url: 'https://example.com/tool.zip',
                  },
                ],
              },
            })),
            getReleaseByTag: mock.fn(async () => ({
              data: {
                tag_name: 'v0.5.0',
                assets: [],
              },
            })),
          },
        },
      })),
    }
  })

  const { moddableExists, getModdableVersion, fetchRelease } = await import('#src/toolbox/setup/moddable.js')

  it('moddableExists returns a boolean', () => {
    const result = moddableExists()
    assert.ok(typeof result === 'boolean')
  })

  it('getModdableVersion returns a Result', async () => {
    const result = await getModdableVersion()
    assert.ok(result && typeof result === 'object' && 'success' in result)
  })

  it('fetchRelease returns a Result', async () => {
    const result = await fetchRelease('latest')
    assert.ok(result && typeof result === 'object' && 'success' in result)
  })
})
