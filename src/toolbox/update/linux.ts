import { print, system, filesystem } from 'gluegun'
import { INSTALL_PATH } from '../setup/constants'

export default async function (): Promise<void> {
  print.info('Checking for SDK changes')
  const BUILD_DIR = filesystem.resolve(
    INSTALL_PATH,
    'build',
    'makefiles',
    'mac'
  )

  const currentRev: string = await system.exec('git rev-parse public', {
    cwd: process.env.MODDABLE,
  })
  const remoteRev: string = await system.exec(
    'git ls-remote origin refs/heads/public',
    { cwd: process.env.MODDABLE }
  )

  if (remoteRev.split('\t').shift() === currentRev.trim()) {
    print.success('Moddable SDK already up to date!')
    process.exit(0)
  }

  const spinner = print.spin()
  spinner.start('Updating Moddable SDK!')

  spinner.start('Stashing any unsaved changes before committing')
  await system.exec('git stash', { cwd: process.env.MODDABLE })
  await system.exec('git pull origin public', { cwd: process.env.MODDABLE })

  await system.exec('rm -rf build/{tmp,bin}', { cwd: process.env.MODDABLE })
  spinner.succeed()

  spinner.start('Rebuilding platform tools')
  await system.exec('make', {
    cwd: BUILD_DIR,
    stdout: process.stdout,
  })
  spinner.succeed()

  spinner.start('Reinstalling simulator')
  await system.exec('make install', {
    cwd: BUILD_DIR,
    stdout: process.stdout,
    stdin: process.stdin,
  })
  spinner.succeed()

  print.success(
    'Moddable SDK successfully updated! Start the xsbug.app and run the "helloworld example": xs-dev run --example helloworld'
  )
}
