import { buildCommand } from '@stricli/core'
import ora from 'ora'
import type { LocalContext } from '../app.js'
import { teardown } from '../toolbox/teardown/index.js'

const command = buildCommand({
  docs: {
    brief:
      'Remove all installed git repos and toolchains, unset environment changes',
  },
  async func(this: LocalContext) {
    const spinner = ora()
    spinner.start('Tearing down Moddable tools and platform dependencies')
    await teardown()
    spinner.succeed('Clean up complete!')
  },
  parameters: {
    flags: {},
  },
})

export default command
