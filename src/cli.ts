#!/usr/bin/env node
import process from 'node:process'
import {
  filesystem,
  strings,
  print,
  system,
  semver,
  http,
  patching,
  prompt,
  packageManager,
} from 'gluegun'
import {
  run as runApp,
} from '@stricli/core'
import { version } from '../package.json'
import { app } from './app'

/**
 * Create the cli and kick it off
 */
runApp(app, process.argv.slice(2), {
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
}).catch(console.error)
