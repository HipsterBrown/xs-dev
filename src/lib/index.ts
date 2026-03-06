// Core setup operations
export { default as setupMac } from '../toolbox/setup/mac.js'

// Interfaces and utilities
export type { OperationEvent } from './events.js'
export type { Prompter, Choice } from './prompter.js'
export { createInteractivePrompter, createNonInteractivePrompter } from './prompter.js'
export { parallel } from './parallel.js'

// Types
export type { SetupArgs, PlatformSetupArgs } from '../toolbox/setup/types.js'
export type { Device } from '../types.js'
