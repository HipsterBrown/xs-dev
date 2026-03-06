import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

export default async function* updateWasm(
  _args: Record<string, unknown>,
  _prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  yield { type: 'warning', message: 'Wasm update is not currently supported' }
}
