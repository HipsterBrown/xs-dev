#!/usr/bin/env node
import process from 'node:process'
import type { GluegunToolbox } from 'gluegun'
import { filesystem, strings, print, system, semver, http, patching, prompt, packageManager } from 'gluegun'
// @ts-expect-error opaque import path, to be replaced by vendored solution
import { buildGenerate } from 'gluegun/build/toolbox/template-tools'
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

export type LocalContext = CommandContext &
  Pick<GluegunToolbox, 'filesystem' | 'strings' | 'print' | 'system' | 'semver' | 'http' | 'patching' | 'prompt' | 'packageManager' | 'template'> &
{
  currentVersion: string;
}

const commands = buildRouteMap({
  routes: {
    build,
    clean,
    debug,
    doctor,
    include,
    init,
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
  aliases: {
    dr: 'doctor',
    info: 'doctor',
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
runApp(app,
  process.argv.slice(2),
  {
    process,
    filesystem,
    strings,
    print,
    system,
    semver,
    http,
    patching,
    prompt,
    packageManager,
    currentVersion: version,
    template: { generate: buildGenerate({}) }
  }
).catch(console.error)
