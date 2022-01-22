import { system, semver } from 'gluegun'
import type { GluegunPrint } from 'gluegun'

// brew install python3, cmake, ninja, dfu-util
export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>
): Promise<void> {
  if (
    system.which('python') === null ||
    // get python verion, check if v3
    semver.satisfies(
      (await system.exec('python --version', { trim: true }))
        .toString()
        .split(' ')
        .pop(),
      '>= 3.x.x'
    )
  ) {
    await system.exec('brew install python')
  }

  if (system.which('cmake') === null) {
    await system.exec('brew install cmake')
  }

  if (system.which('ninja') === null) {
    await system.exec('brew install ninja')
  }

  if (system.which('dfu-util') === null) {
    await system.exec('brew install dfu-util')
  }

  // 4. install pip, if needed
  if (system.which('pip3') === null) {
    spinner.start('Installing pip3')
    await system.exec('python3 -m ensurepip --user')
    spinner.succeed()
  }

  // 5. pip install pyserial, if needed
  spinner.start('Installing pyserial through pip3')
  await system.exec('python3 -m pip install pyserial')
  spinner.succeed()
}
