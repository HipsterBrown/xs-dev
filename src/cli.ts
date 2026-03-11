#!/usr/bin/env node
import process from 'node:process'
import { run as runApp } from '@stricli/core'
import { app } from './app.js'
import packageJson from '../package.json' with { type: 'json' }
const { version } = packageJson

/**
 * Create the cli and kick it off
 */
runApp(app, process.argv.slice(2), {
  process,
  currentVersion: version,
}).catch(console.error)
