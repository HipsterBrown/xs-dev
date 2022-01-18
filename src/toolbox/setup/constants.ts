import { filesystem } from 'gluegun'

export const HOME_DIR = filesystem.homedir()
export const INSTALL_DIR = filesystem.resolve(HOME_DIR, '.local', 'share')
export const INSTALL_PATH =
  process.env.MODDABLE ?? filesystem.resolve(INSTALL_DIR, 'moddable')
export const PROFILE = (function () {
  const shell = process.env.SHELL ?? ''
  if (shell.includes('zsh')) return '.zshrc'
  if (shell.includes('bash')) return '.bashrc'
  return '.profile'
})()
export const PROFILE_PATH = filesystem.resolve(HOME_DIR, PROFILE)
export const EXPORTS_FILE_PATH = filesystem.resolve(
  HOME_DIR,
  '.local',
  'share',
  'xs-dev-export.sh'
)
