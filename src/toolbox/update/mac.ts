import { print, system, filesystem } from 'gluegun'

export default async function (): Promise<void> {
  print.info('Checking for SDK changes')

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

  spinner.info('Stashing any unsaved changes before committing')
  await system.exec('git stash', { cwd: process.env.MODDABLE })
  await system.exec('git pull origin public', { cwd: process.env.MODDABLE })

  await system.exec('rm -rf build/{tmp,bin}', { cwd: process.env.MODDABLE })

  spinner.info('Rebuilding platform tools')
  await system.exec('make', {
    cwd: filesystem.resolve(
      String(process.env.MODDABLE),
      'build',
      'makefiles',
      'mac'
    ),
  })

  spinner.succeed(
    'Moddable SDK successfully updated! Start the xsbug.app and run the "helloworld example": xs-dev run --example helloworld'
  )
}
