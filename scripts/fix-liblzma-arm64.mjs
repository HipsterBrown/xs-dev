/**
 * Workaround for node-liblzma missing darwin-arm64 prebuild.
 *
 * The darwin-x64 prebuild is a universal binary (x86_64 + arm64 slices),
 * so it works on Apple Silicon. node-gyp-build only looks in darwin-arm64/
 * on arm64 hosts, so we copy the universal binary there.
 *
 * Track upstream fix: https://github.com/oorabona/node-liblzma
 */
'use strict'

import { existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { platform, arch } from 'node:os'
import { debuglog } from 'node:util'

const debug = debuglog('xs-dev')

if (platform() === 'darwin' && arch() === 'arm64') {
  try {
    const pkg = require.resolve('node-liblzma')
    const prebuildsDir = join(pkg, '..', '..', 'prebuilds')
    const src = join(prebuildsDir, 'darwin-x64', 'node-liblzma.node')
    const destDir = join(prebuildsDir, 'darwin-arm64')
    const dest = join(destDir, 'node-liblzma.node')

    if (existsSync(src) && !existsSync(dest)) {
      mkdirSync(destDir, { recursive: true })
      copyFileSync(src, dest)
      debug(
        'node-liblzma: copied universal darwin-x64 prebuild to darwin-arm64',
      )
    }
  } catch {
    // node-liblzma is optional — silently skip if not installed
  }
}
