import type { Dependency } from '../../system/types'
import { findMissingDependencies, installPackages } from '../../system/packages'
import { isFailure } from '../../system/errors'
import type { OperationEvent } from '../../../lib/events.js'

export async function* installDeps(_prompter?: unknown): AsyncGenerator<OperationEvent> {
  yield { type: 'step:start', message: 'Installing python deps with apt-get' }
  const dependencies: Dependency[] = [
    { name: 'pip', packageName: 'python-pip', type: 'binary' },
    { name: 'pyserial-miniterm', packageName: 'python3-serial', type: 'binary' },
    { name: 'python', packageName: 'python-is-python3', type: 'binary' },
  ]

  const missingDepsResult = await findMissingDependencies(dependencies)
  if (isFailure(missingDepsResult)) {
    yield { type: 'step:fail', message: `Error checking dependencies: ${missingDepsResult.error}` }
    return
  }

  if (missingDepsResult.data.length !== 0) {
    const result = await installPackages(missingDepsResult.data)
    if (isFailure(result)) {
      yield { type: 'step:fail', message: `Error installing packages: ${result.error}` }
      return
    }
  }
  yield { type: 'step:done' }
}
