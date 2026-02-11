import { print, filesystem, system } from 'gluegun'
import { type as platformType } from 'os'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from './constants'
import upsert from '../patching/upsert'
import { installDeps as installMacDeps } from './zephyr/mac'
import { installDeps as installLinuxDeps } from './zephyr/linux'
import { moddableExists } from './moddable'
import { sourceEnvironment } from '../system/exec'
import { failure, successVoid, isFailure } from '../system/errors'
import type { SetupResult } from '../../types'
import { detectPython } from '../system/python'

export default async function(): Promise<SetupResult> {
  const OS = platformType().toLowerCase()
  const ZEPHYR_ROOT =
    process.env.ZEPHYR_ROOT ?? filesystem.resolve(INSTALL_DIR, 'zephyrproject')
  const ZEPHYR_BASE =
    process.env.ZEPHYR_BASE ?? filesystem.resolve(ZEPHYR_ROOT, 'zephyr')
  const ZEPHYR_VENV = filesystem.resolve(ZEPHYR_ROOT, '.venv')
  const ZEPHYR_VENV_ACTIVATE = filesystem.resolve(ZEPHYR_VENV, 'bin', 'activate')

  await sourceEnvironment()

  const spinner = print.spin()
  spinner.start('Starting zephyr tooling setup')

  // 0. ensure zephyr install directory and Moddable exists
  if (!moddableExists()) {
    spinner.fail(
      'Moddable platform tooling required. Run `xs-dev setup` before trying again.',
    )
    return failure('Moddable platform tooling required. Run `xs-dev setup` before trying again.')
  }
  spinner.info('Ensuring zephyr directory')
  filesystem.dir(ZEPHYR_ROOT)

  // 1. Install required components
  if (OS === 'darwin') {
    const result = await installMacDeps(spinner)
    if (isFailure(result)) return result
  }

  if (OS === 'linux') {
    spinner.start('Installing dependencies with apt')
    const result = await installLinuxDeps(spinner)
    if (isFailure(result)) return result
  }
  spinner.succeed()

  // 2. Create zephyr virtual environment
  if (filesystem.exists(ZEPHYR_VENV) === false) {
    spinner.start('Creating zephyr virtual environment')
    const localPython = detectPython()
    await system.exec(
      `${localPython} -m venv ${ZEPHYR_VENV}`,
      {
        stdout: process.stdout,
      },
    )
    spinner.succeed()
  }
  // 3. Activate virtual environment
  await upsert(EXPORTS_FILE_PATH, `source ${ZEPHYR_VENV_ACTIVATE}`)
  await sourceEnvironment()

  // 4. Install West with pip
  spinner.start('Installing west build tool')
  await system.exec(`pip install west`, {
    process,
    shell: process.env.SHELL,
  })
  spinner.succeed()

  // 5. Install west build tools
  spinner.start(`Initializing west tooling in ${ZEPHYR_ROOT}`)
  await system.exec(`west init ${ZEPHYR_ROOT}`, {
    process,
    shell: process.env.SHELL,
  })
  await system.exec(`west update`, {
    cwd: ZEPHYR_ROOT,
    process,
    shell: process.env.SHELL,
  })
  spinner.succeed()

  // 6. Install west packages
  spinner.start(`Installing west packages`)
  await system.exec(`west packages pip --install`, {
    process,
    shell: process.env.SHELL,
    stdout: process.stdout
  })
  spinner.succeed()

  // 7. Install Zephyr SDK 
  spinner.start(`Installing Zephyr SDK in ${ZEPHYR_BASE}`)
  await system.exec(`west sdk install`, {
    cwd: ZEPHYR_BASE,
    process,
    shell: process.env.SHELL,
  })
  spinner.succeed()

  if (process.env.ZEPHYR_BASE === undefined) {
    await upsert(EXPORTS_FILE_PATH, `export ZEPHYR_BASE=${ZEPHYR_BASE}`)
  }

  print.success(`
Successfully set up zephyr platform support for Moddable!
Test out the setup by starting a new terminal session,
Then run: xs-dev run --example helloworld --device zephyr/<board_name>
  `)

  return successVoid()
}
