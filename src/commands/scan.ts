import { buildCommand } from '@stricli/core'
import ora from 'ora'
import type { LocalContext } from '../app.js'
import { handleEvent } from '../lib/renderer.js'
import scanDevices from '../toolbox/scan/index.js'

const command = buildCommand({
  docs: {
    brief: 'Look for available devices for deployment',
  },
  async func(this: LocalContext) {
    const spinner = ora()
    for await (const event of scanDevices()) {
      handleEvent(event, spinner)
    }
  },
  parameters: {
    flags: {},
  },
})

export default command
