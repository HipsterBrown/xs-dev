import { patching } from 'gluegun'

export default async function (
  filePath: string,
  newLine: string
): Promise<void> {
  await patching.update(filePath, (contents: string) => {
    if (!contents.includes(newLine)) {
      return [contents, newLine].join('\n')
    }
    return contents
  })
}
