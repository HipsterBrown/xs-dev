import { statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export interface TreeNode {
  name: string
  type: 'dir' | 'file'
  children: TreeNode[]
}

export function buildTree(dirPath: string, name: string): TreeNode {
  const stat = statSync(dirPath)
  if (stat.isDirectory()) {
    const children = readdirSync(dirPath).map((entry) =>
      buildTree(join(dirPath, entry), entry),
    )
    return { name, type: 'dir', children }
  }
  return { name, type: 'file', children: [] }
}
