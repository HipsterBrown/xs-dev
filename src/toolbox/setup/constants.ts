import { filesystem, system } from 'gluegun'

export const HOME_DIR = filesystem.homedir()
export const INSTALL_DIR = filesystem.resolve(HOME_DIR, '.local', 'share')
export const INSTALL_PATH =
  process.env.MODDABLE ?? filesystem.resolve(INSTALL_DIR, 'moddable')
export const PROFILE = await (async function () {
  const shell = process.env.SHELL ?? (await system.run(`echo $0`))
  if (shell.includes('zsh')) return '.zshrc'
  if (shell.includes('bash')) return '.bashrc'
  return '.profile'
})()
export const PROFILE_PATH = filesystem.resolve(HOME_DIR, PROFILE)
