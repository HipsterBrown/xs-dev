import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

export default async function upsert(filePath: string, newLine: string): Promise<void> {
  let contents = ''
  if (existsSync(filePath)) {
    contents = await readFile(filePath, 'utf8')
  }
  if (!contents.includes(newLine)) {
    await writeFile(filePath, [contents, newLine].join('\n'), 'utf8')
  }
}
