import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

export default async function* updateEsp8266(
  _args: Record<string, unknown>,
  _prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  yield { type: 'warning', message: 'ESP8266 update is not currently supported' }
}
