interface InspectTreeResult {
  name: string
  type: 'dir' | 'file' | 'symlink'
  children: InspectTreeResult[]
}

export function collectChoicesFromTree(
  fd: InspectTreeResult,
  results: string[] = [],
  root = '',
): string[] {
  if (
    fd.type === 'dir' &&
    fd.children.find((file) => file.name === 'manifest.json') !== undefined
  ) {
    results.push(root + fd.name)
  } else if (fd.type === 'dir') {
    results.concat(
      fd.children.flatMap((child) =>
        collectChoicesFromTree(child, results, `${root}${fd.name}/`),
      ),
    )
  }
  return results.flat()
}
