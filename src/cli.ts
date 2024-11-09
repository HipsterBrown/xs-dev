#!/usr/bin/env node
import process from 'node:process'
import type { GluegunToolbox } from 'gluegun'
import { filesystem, strings, print, system, semver, http, patching, prompt, packageManager } from 'gluegun'
import { buildApplication, buildCommand, buildRouteMap, run as runApp, CommandContext } from '@stricli/core'
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

export type LocalContext = CommandContext & Pick<GluegunToolbox, 'filesystem' | 'strings' | 'print' | 'system' | 'semver' | 'http' | 'patching' | 'prompt' | 'packageManager'>;
// const routes = buildRouteMap({
//   routes: {
//     subdir: subdirCommand,
//     nested: nestedRoutes,
//     install: buildInstallCommand("sticli-app", { bash: "__sticli-app_bash_complete" }),
//     uninstall: buildUninstallCommand("sticli-app", { bash: true }),
//   },
//   docs: {
//     brief: description,
//     hideRoute: {
//       install: true,
//       uninstall: true,
//     },
//   },
// });

// export const app = buildApplication(routes, {
//   name,
//   versionInfo: {
//     currentVersion: version,
//   },
// });

const commands = buildRouteMap({
  routes: {
    build: buildCommand({
      func: build.run,
      docs: {
        brief: build.description ?? '',
      },
      parameters: {
        flags: {}
      },
    }),
    clean: buildCommand({
      func: clean.run,
      docs: {
        brief: clean.description ?? '',
      },
      parameters: {
        flags: {}
      },
    }),
    debug: buildCommand({
      func: debug.run,
      docs: {
        brief: debug.description ?? '',
      },
      parameters: {
        flags: {}
      },
    }),
    doctor: buildCommand({
      func: doctor.run,
      docs: {
        brief: doctor.description ?? '',
      },
      parameters: {
        flags: {}
      },
    }),
    include: buildCommand({
      func: include.run,
      docs: {
        brief: include.description ?? '',
      },
      parameters: {
        flags: {}
      },
    }),
    init: buildCommand({
      func: init.run,
      docs: {
        brief: init.description ?? '',
      },
      parameters: {
        flags: {}
      },
    }),
    remove: buildCommand({
      func: remove.run,
      docs: {
        brief: remove.description ?? '',
      },
      parameters: {
        flags: {}
      },
    }),
    run: buildCommand({
      func: run.run,
      docs: {
        brief: run.description ?? '',
      },
      parameters: {
        flags: {}
      },
    }),
    scan: buildCommand({
      func: scan.run,
      docs: {
        brief: scan.description ?? '',
      },
      parameters: {
        flags: {}
      },
    }),
    setup: buildCommand({
      func: setup.run,
      docs: {
        brief: setup.description ?? '',
      },
      parameters: {
        flags: {}
      },
    }),
    teardown: buildCommand({
      func: teardown.run,
      docs: {
        brief: teardown.description ?? '',
      },
      parameters: {
        flags: {}
      },
    }),
    update: buildCommand({
      func: update.run,
      docs: {
        brief: update.description ?? '',
      },
      parameters: {
        flags: {}
      },
    }),
  },
  docs: {
    brief: description,
  }
})

const app = buildApplication<LocalContext>(commands, {
  name,
  versionInfo: {
    currentVersion: version,
  }
})

/**
 * Create the cli and kick it off
 */
runApp(app, process.argv.slice(2), { process, filesystem, strings, print, system, semver, http, patching, prompt, packageManager }).catch(console.error)
// async function run(argv: string[]): Promise<GluegunToolbox> {
//   // create a CLI runtime
//   const cli = build()
//     .brand('xs-dev')
//     .src(__dirname)
//     .help() // provides default for help, h, --help, -h
//     .version() // provides default for version, v, --version, -v
//     .checkForUpdates(25)
//     .create()
//   // enable the following method if you'd like to skip loading one of these core extensions
//   // this can improve performance if they're not necessary for your project:
//   // .exclude(['meta', 'strings', 'print', 'filesystem', 'semver', 'system', 'prompt', 'http', 'template', 'patching', 'package-manager'])
//   // and run it
//   return await cli.run(argv)
// }

// module.exports = { run }
