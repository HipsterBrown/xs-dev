import { execWithSudo } from '../../system/exec'
import { isFailure } from '../../system/errors'
import type { OperationEvent } from '../../../lib/events.js'

export async function* installDeps(_prompter?: unknown): AsyncGenerator<OperationEvent> {
  const result = await execWithSudo(
    `apt-get install --yes cmake gcc-arm-none-eabi libnewlib-arm-none-eabi build-essential libusb-1.0.0-dev pkg-config xz-utils file make gcc gcc-multilib g++-multilib libsdl2-dev libmagic1`,
    { stdio: 'inherit' },
  )
  if (isFailure(result)) {
    yield { type: 'step:fail', message: `Error installing dependencies: ${result.error}` }
    return
  }
  yield { type: 'step:done' }
}
