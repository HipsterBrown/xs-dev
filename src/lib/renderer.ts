import type { OperationEvent } from './events.js'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import ora from 'ora'

export function handleEvent(event: OperationEvent, spinner: ReturnType<typeof ora>): void {
  switch (event.type) {
    case 'step:start': spinner.start(event.message); break
    case 'step:done': spinner.succeed(event.message ?? ''); break
    case 'step:fail': spinner.fail(event.message); process.exit(1); break
    case 'warning': spinner.warn(event.message); break
    case 'info': spinner.info(event.message); break
  }
}
