import type { GluegunPrint } from 'gluegun'
import type { Dependency } from '../../system/types'
import { findMissingDependencies, installPackages } from '../../system/packages'
import { successVoid, isFailure } from '../../system/errors'
import type { SetupResult } from '../../../types'

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>,
): Promise<SetupResult> {
  spinner.start('Installing python deps with apt-get')
  const dependencies: Dependency[] = [
    { name: 'pip', packageName: 'python-pip', type: 'binary' },
    { name: 'pyserial-miniterm', packageName: 'python3-serial', type: 'binary' },
    { name: 'python', packageName: 'python-is-python3', type: 'binary' },
  ]

  const missingDepsResult = await findMissingDependencies(dependencies)
  if (isFailure(missingDepsResult)) return missingDepsResult
  
  if (missingDepsResult.data.length !== 0) {
    const result = await installPackages(missingDepsResult.data)
    if (isFailure(result)) return result
  }
  spinner.succeed()

  return successVoid()
}
