import type { XSDevToolbox } from '../types'
import { build } from '../toolbox/build/index'

export default async (toolbox: XSDevToolbox): Promise<void> => {
  toolbox.build = build
}
