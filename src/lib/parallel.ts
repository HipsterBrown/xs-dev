import type { OperationEvent } from './events.js'

export async function* parallel<T extends OperationEvent>(
  tasks: Array<{ id: string; generator: AsyncGenerator<T> }>
): AsyncGenerator<T & { taskId: string }> {
  const active = new Map(
    tasks.map(({ id, generator }) => [id, generator[Symbol.asyncIterator]()])
  )

  while (active.size > 0) {
    // Call next() on all active generators concurrently
    const results = await Promise.all(
      Array.from(active.entries()).map(async ([id, iterator]) => {
        const result = await iterator.next()
        return { id, result }
      })
    )

    // Process results from all generators
    for (const { id, result } of results) {
      if (result.done === true) {
        active.delete(id)
      } else {
        const yielded: T & { taskId: string } = { ...result.value, taskId: id }
        yield yielded
      }
    }
  }
}
