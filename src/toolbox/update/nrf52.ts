import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

export default async function* updateNrf52(
  _args: Record<string, unknown>,
  _prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  yield { type: 'warning', message: 'nRF52 update is not currently supported' }
}
