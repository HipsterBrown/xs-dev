import type { Dependency } from '../../system/types.js'
import { findMissingDependencies, installPackages } from '../../system/packages.js'
import { isFailure, unwrapOr } from '../../system/errors.js'
import type { Prompter } from '../../../lib/prompter.js'
import type { OperationEvent } from '../../../lib/events.js'

export async function* installDeps(prompter: Prompter): AsyncGenerator<OperationEvent> {
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

  try {
    const missingDependencies = unwrapOr(await findMissingDependencies(dependencies), [])
    if (missingDependencies.length !== 0) {
      const result = await installPackages(missingDependencies)
      if (isFailure(result)) {
        yield { type: 'step:fail', message: `Error installing dependencies: ${result.error}` }
        return
      }
    }
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error installing esp32 linux dependencies: ${String(error)}` }
  }
}
