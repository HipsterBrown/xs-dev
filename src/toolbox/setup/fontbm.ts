import { print, filesystem, system } from 'gluegun'
import { EXPORTS_FILE_PATH, INSTALL_DIR } from './constants'
import upsert from '../patching/upsert'
import { type as platformType } from 'os'
import { exit } from 'process'
import { execWithSudo } from '../system/exec'
import { ensureHomebrew } from './homebrew'

export default async function(): Promise<void> {
  const spinner = print.spin()
  spinner.start('Beginning setup...')

  const OS = platformType().toLowerCase()
  if (OS !== 'darwin' && OS !== 'linux') {
    print.error(`OS "${OS}" not supported`)
    exit(1)
  }

  const FONTBM_REPO = 'https://github.com/vladimirgamalyan/fontbm.git'
  const FONTBM_DIR = filesystem.resolve(INSTALL_DIR, 'fontbm')
  const FONTBM_TAG = 'v0.5.0'

  // 1. install cmake
  if (system.which('cmake') === null) {
    if (OS === 'darwin') {
      try {
        await ensureHomebrew()
      } catch (error: unknown) {
        if (error instanceof Error) {
          print.info(`${error.message} cmake`)
          process.exit(1);
        }
      }

      spinner.start('Cmake required, installing with Homebrew')
      await system.exec('brew install cmake', { shell: process.env.SHELL })
      spinner.succeed()
    }
    if (OS === 'linux') {
      spinner.start('CMake required, installing with apt')
      await execWithSudo(
        'apt-get install --yes build-essential cmake',
        { stdout: process.stdout }
      )
      spinner.succeed()
    }
  }

  // 2. install freetype
  if (OS === 'darwin') {
    if (system.which('freetype-config') === null) {
      try {
        await ensureHomebrew()
      } catch (error: unknown) {
        if (error instanceof Error) {
          print.info(`${error.message} freetype-config`)
          process.exit(1);
        }
      }

      spinner.start('FreeType required, installing with Homebrew')
      await system.exec('brew install freetype', { shell: process.env.SHELL })
      spinner.succeed()
    }
  }
  if (OS === 'linux') {
    spinner.start('Installing libfreetype-dev')
    await execWithSudo(
      'apt-get install --yes libfreetype-dev',
      { stdout: process.stdout }
    )
    spinner.succeed()
  }

  // 3. clone fontbm
  if (filesystem.exists(FONTBM_DIR) === false) {
    spinner.start(`Cloning fontbm repo (tag "${FONTBM_TAG}")`)
    await system.spawn(
      `git clone ${FONTBM_REPO} --depth 1 --single-branch --branch ${FONTBM_TAG} ${FONTBM_DIR}`
    )
    spinner.succeed()
  }

  // 4. build fontbm
  spinner.start('Building fontbm')
  await system.exec('cmake .', {
    cwd: FONTBM_DIR,
    stdout: process.stdout,
  })
  await system.exec('make', {
    cwd: FONTBM_DIR,
    stdout: process.stdout,
  })
  spinner.succeed()

  // 5. set FONTBM environment variable
  if (process.env.FONTBM === undefined) {
    process.env.FONTBM = `${FONTBM_DIR}/fontbm`
    await upsert(EXPORTS_FILE_PATH, `export FONTBM=${process.env.FONTBM}`)
  }

  spinner.succeed('fontbm successfully set up!')
}
