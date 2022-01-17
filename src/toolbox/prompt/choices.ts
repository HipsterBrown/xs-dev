interface InspectTreeResult {
  name: string
  type: 'dir' | 'file' | 'symlink'
  children: InspectTreeResult[]
}

export function collectChoicesFromTree(
  fd: InspectTreeResult,
  results: string[] = [],
  root: string = ''
): string[] {
  if (
    fd.type === 'dir' &&
    fd.children.find((file) => file.name === 'manifest.json') !== undefined
  ) {
    results.push(root + fd.name)
  } else if (fd.type === 'dir') {
    results.concat(
      fd.children
        .map((child) =>
          collectChoicesFromTree(child, results, `${root}${fd.name}/`)
        )
        .flat()
    )
  }
  return results.flat()
}
