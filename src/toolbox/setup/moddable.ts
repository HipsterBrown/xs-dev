import { filesystem } from 'gluegun'

export function moddableExists(): boolean {
  return (
    process.env.MODDABLE !== undefined &&
    filesystem.exists(process.env.MODDABLE) === 'dir'
  )
}
