import { Readable } from 'node:stream'

export async function fetchStream(url: string): Promise<Readable> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${url}`)
  }
  if (response.body === null) {
    throw new Error(`Empty response body: ${url}`)
  }
  return Readable.fromWeb(response.body)
}
