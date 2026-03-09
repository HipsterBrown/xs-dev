#!/usr/bin/env node
import process from 'node:process'
import { run as runApp } from '@stricli/core'
import { version } from '../package.json'
import { app } from './app'

/**
 * Create the cli and kick it off
 */
runApp(app, process.argv.slice(2), {
  process,
  currentVersion: version,
}).catch(console.error)
