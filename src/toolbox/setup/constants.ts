import { filesystem } from 'gluegun'

export const HOME_DIR = filesystem.homedir()
export const INSTALL_DIR = filesystem.resolve(HOME_DIR, '.local', 'share')
export const INSTALL_PATH =
  process.env.MODDABLE ?? filesystem.resolve(INSTALL_DIR, 'moddable')
export const EXPORTS_FILE_PATH = filesystem.resolve(
  HOME_DIR,
  '.local',
  'share',
  'xs-dev-export.sh'
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
