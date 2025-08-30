import type { Dependency } from './types'
import { pkexec } from '../system/exec'
import { system } from 'gluegun'
import type { Result } from '../../types'
import { failure, wrapAsync } from './errors'

/**
 * Check if the list of dependencies are installed on the system.
 **/
export async function findMissingDependencies(dependencies: Dependency[]): Promise<Result<Dependency[]>> {
  return await wrapAsync(async () => {
    const missingDependencies: Dependency[] = []

    for (const dep of dependencies) {
      if (dep.type === 'binary') {
        if (system.which(dep.name) === null) {
          missingDependencies.push(dep)
        }
      }
      if (dep.type === 'library') {
        try {
          await system.run(`pkg-config --exists ${dep.name}`)
        } catch (error) {
          missingDependencies.push(dep)
        }
      }
      if (dep.type === 'pylib') {
        try {
          await system.run(`pip3 show ${dep.name}`)
        } catch (error) {
          missingDependencies.push(dep)
        }
      }
    }

    return missingDependencies
  })
}

/**
 * Attempt to install packages on the linux platform.
 **/
export async function installPackages(packages: Dependency[]): Promise<Result<void>> {
  const packageManager = system.which('apt')

  if (packageManager !== null && packageManager !== undefined) {
    const result = await pkexec(
      `${packageManager} install --yes ${packages.map((p) => p.packageName).join(' ')}`,
      { stdout: process.stdout },
    )
    return result
  } else {
    return failure(
      `xs-dev attempted to install dependencies, but does not yet support your package manager. ` +
      `Please install these dependencies before running this command again: ${packages.map((p) => p.packageName).join(', ')}`
    )
  }
}
