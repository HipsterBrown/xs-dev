import type { Dependency } from '../../system/types'
import { findMissingDependencies, installPackages } from '../../system/packages'
import { isFailure } from '../../system/errors'
import type { OperationEvent } from '../../../lib/events.js'

export async function* installDeps(_prompter?: unknown): AsyncGenerator<OperationEvent> {
  const dependencies: Dependency[] = [
    { name: 'bison', packageName: 'bison', type: 'binary' },
    { name: 'ccache', packageName: 'ccache', type: 'binary' },
    { name: 'cmake', packageName: 'cmake', type: 'binary' },
    { name: 'dfu-util', packageName: 'dfu-util', type: 'binary' },
    { name: 'flex', packageName: 'flex', type: 'binary' },
    { name: 'git', packageName: 'git', type: 'binary' },
    { name: 'gperf', packageName: 'gperf', type: 'binary' },
    { name: 'libffi', packageName: 'libffi-dev', type: 'library' },
    { name: 'libssl', packageName: 'libssl-dev', type: 'library' },
    { name: 'ninja', packageName: 'ninja-build', type: 'binary' },
    { name: 'pip', packageName: 'python3-pip', type: 'binary' },
    { name: 'pyserial-miniterm', packageName: 'python3-serial', type: 'binary' },
    { name: 'venv', packageName: 'python3-venv', type: 'binary' },
    { name: 'python', packageName: 'python-is-python3', type: 'binary' },
    { name: 'setuptools', packageName: 'python3-setuptools', type: 'pylib' },
    { name: 'wget', packageName: 'wget', type: 'binary' },
  ]

  yield { type: 'step:start', message: 'Checking for missing dependencies' }
  const missingDependenciesResult = await findMissingDependencies(dependencies)
  if (isFailure(missingDependenciesResult)) {
    yield { type: 'step:fail', message: `Error checking dependencies: ${missingDependenciesResult.error}` }
    return
  }

  if (missingDependenciesResult.data.length !== 0) {
    yield { type: 'step:start', message: 'Attempting to install dependencies' }
    const result = await installPackages(missingDependenciesResult.data)
    if (isFailure(result)) {
      yield { type: 'step:fail', message: `Error installing dependencies: ${result.error}` }
      return
    }
  }
  yield { type: 'step:done' }
}
