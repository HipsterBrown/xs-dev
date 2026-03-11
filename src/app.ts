import {
  buildApplication,
  buildRouteMap,
  type CommandContext,
} from '@stricli/core'
import build from './commands/build.js'
import clean from './commands/clean.js'
import debug from './commands/debug.js'
import doctor from './commands/doctor.js'
import include from './commands/include.js'
import init from './commands/init.js'
import remove from './commands/remove.js'
import run from './commands/run.js'
import scan from './commands/scan.js'
import setup from './commands/setup.js'
import teardown from './commands/teardown.js'
import update from './commands/update.js'
import packageJson from '../package.json' with { type: 'json' }
const { description, version, name } = packageJson

export type LocalContext = CommandContext & {
  currentVersion: string
}

const commands = buildRouteMap({
  routes: {
    build,
    clean,
    debug,
    doctor,
    include,
    init,
    remove,
    run,
    scan,
    setup,
    teardown,
    update,
  },
  aliases: {
    dr: 'doctor',
    info: 'doctor',
  },
  docs: {
    brief: description,
  },
})

export const app = buildApplication<LocalContext>(commands, {
  name,
  versionInfo: {
    currentVersion: version,
  },
})
