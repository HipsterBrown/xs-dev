import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

export async function replace(
  filePath: string,
  searchValue: string,
  replaceValue: string,
): Promise<void> {
  if (!existsSync(filePath)) {
    return
  }

  const contents = await readFile(filePath, 'utf8')
  const newContents = contents.replace(searchValue, replaceValue)
  await writeFile(filePath, newContents, 'utf8')
}
