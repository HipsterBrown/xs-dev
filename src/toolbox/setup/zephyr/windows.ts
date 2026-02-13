import { print, system } from 'gluegun'
import type { GluegunPrint } from 'gluegun'
import type { Result } from '../../../types'
import { failure, successVoid } from '../../system/errors'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>,
): Promise<Result<void>> {

  spinner.start('Downloading ESP-IDF Tools Installer')
  try {
    await system.exec('where winget')
  } catch (error) {
    print.error(
      'winget is required to install dependencies for Zephyr tooling.',
    )
    print.info(
      'You can install winget via the App Installer package in the Microsoft Store.',
    )
    spinner.fail()
    return failure('winget is required to install dependencies for Zephyr tooling.')
  }
  await system.exec(
    'winget install Kitware.CMake Ninja-build.Ninja oss-winget.gperf Python.Python.3.12 Git.Git oss-winget.dtc wget 7zip.7zip',
    { stdio: 'inherit', shell: true },
  )
  spinner.succeed()
  return successVoid()
}

