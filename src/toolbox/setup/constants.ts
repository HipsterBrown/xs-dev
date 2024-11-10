import { filesystem } from 'gluegun'
import { type as platformType } from 'os'
import type { Device } from '../../types'

const currentPlatform: Device = platformType().toLowerCase() as Device
const isWindows = currentPlatform === 'windows_nt'

export const HOME_DIR = filesystem.homedir()
export const INSTALL_DIR = isWindows
  ? filesystem.resolve(HOME_DIR, 'xs-dev')
  : filesystem.resolve(HOME_DIR, '.local', 'share')
export const INSTALL_PATH =
  process.env.MODDABLE ?? filesystem.resolve(INSTALL_DIR, 'moddable')
export const EXPORTS_FILE_PATH = isWindows
  ? filesystem.resolve(INSTALL_DIR, 'Moddable.bat')
  : filesystem.resolve(HOME_DIR, '.local', 'share', 'xs-dev-export.sh')
export const MODDABLE_REPO = 'https://github.com/Moddable-OpenSource/moddable'
export const XSBUG_LOG_PATH = filesystem.resolve(
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

  let profilePath = filesystem.resolve(HOME_DIR, profile)
  if (filesystem.exists(profilePath) === 'file') return profilePath

  profilePath = filesystem.resolve(HOME_DIR, '.profile')
  filesystem.file(profilePath)
  return profilePath
}
