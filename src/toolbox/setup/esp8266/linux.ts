import type { Dependency } from '../../system/types.js'
import { findMissingDependencies, installPackages } from '../../system/packages.js'
import { isFailure } from '../../system/errors.js'
import type { Prompter } from '../../../lib/prompter.js'
import type { OperationEvent } from '../../../lib/events.js'

export async function* installDeps(prompter: Prompter): AsyncGenerator<OperationEvent> {
  yield { type: 'step:start', message: 'Installing python deps with apt-get' }

  try {
    const dependencies: Dependency[] = [
      { name: 'pip', packageName: 'python-pip', type: 'binary' },
      { name: 'pyserial-miniterm', packageName: 'python3-serial', type: 'binary' },
      { name: 'python', packageName: 'python-is-python3', type: 'binary' },
    ]

    const missingDepsResult = await findMissingDependencies(dependencies)
    if (isFailure(missingDepsResult)) {
      yield { type: 'step:fail', message: `Error finding dependencies: ${missingDepsResult.error}` }
      return
    }

    if (missingDepsResult.data.length !== 0) {
      const result = await installPackages(missingDepsResult.data)
      if (isFailure(result)) {
        yield { type: 'step:fail', message: `Error installing dependencies: ${result.error}` }
        return
      }
    }
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error installing esp8266 linux dependencies: ${String(error)}` }
  }
}
