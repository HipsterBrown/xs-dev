import type { GluegunToolbox } from 'gluegun'
import {
  buildApplication,
  buildRouteMap,
  type CommandContext,
} from '@stricli/core'
import { description, version, name } from '../package.json'

import build from './commands/build'
import clean from './commands/clean'
import debug from './commands/debug'
import doctor from './commands/doctor'
import include from './commands/include'
import init from './commands/init'
import remove from './commands/remove'
import run from './commands/run'
import scan from './commands/scan'
import setup from './commands/setup'
import teardown from './commands/teardown'
import update from './commands/update'

export type LocalContext = CommandContext &
  Pick<
    GluegunToolbox,
    | 'filesystem'
    | 'strings'
    | 'print'
    | 'system'
    | 'semver'
    | 'http'
    | 'patching'
    | 'prompt'
    | 'packageManager'
  > & {
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
