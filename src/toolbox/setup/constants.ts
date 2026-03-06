import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { type as platformType } from 'node:os'
import type { Device } from '../../types'

const currentPlatform: Device = platformType().toLowerCase() as Device
const isWindows = currentPlatform === 'windows_nt'

export const HOME_DIR = homedir()
export const INSTALL_DIR = isWindows
  ? resolve(HOME_DIR, 'xs-dev')
  : resolve(HOME_DIR, '.local', 'share')
export const INSTALL_PATH =
  process.env.MODDABLE ?? resolve(INSTALL_DIR, 'moddable')
export const EXPORTS_FILE_PATH = isWindows
  ? resolve(INSTALL_DIR, 'Moddable.bat')
  : resolve(HOME_DIR, '.local', 'share', 'xs-dev-export.sh')
export const MODDABLE_REPO = 'https://github.com/Moddable-OpenSource/moddable'
export const XSBUG_LOG_PATH = resolve(
  INSTALL_PATH,
  'tools',
  'xsbug-log',
)
export function getProfilePath(): string {
  const shell = process.env.SHELL ?? ''
  let profile = '.profile'

  if (shell.includes('zsh')) {
    profile = '.zshrc'
  }
  if (shell.includes('bash')) {
    profile = '.bashrc'
  }

  let profilePath = resolve(HOME_DIR, profile)
  if (existsSync(profilePath)) return profilePath

  profilePath = resolve(HOME_DIR, '.profile')
  return profilePath
}
