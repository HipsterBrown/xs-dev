import { print, system, filesystem } from 'gluegun'
import { moddableExists } from '../setup/moddable'

export default async function (): Promise<void> {
  print.info('Checking for SDK changes')

  if (!moddableExists()) {
    print.error(
      'Moddable tooling required. Run `xs-dev setup` before trying again.'
    )
    process.exit(1)
  }

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

  const BIN_DIR = filesystem.resolve(process.env.MODDABLE ?? '', 'build', 'bin')
  const TMP_DIR = filesystem.resolve(process.env.MODDABLE ?? '', 'build', 'tmp')
  filesystem.remove(BIN_DIR)
  filesystem.remove(TMP_DIR)
  spinner.succeed()

  try {
    spinner.start('Rebuilding platform tools: ')
    await system.exec(`build.bat`, { cwd: filesystem.resolve(process.env.MODDABLE ?? '', 'build', 'makefiles', 'win'), stdout: process.stdout})
    spinner.succeed()
  } catch (error) {
    spinner.fail(`Error building Moddable SDK tools: ${String(error)}`)
    process.exit(1)
  }

  spinner.succeed(
    'Moddable SDK successfully updated! Start xsbug and run the "helloworld example": xs-dev run --example helloworld'
  )
}
