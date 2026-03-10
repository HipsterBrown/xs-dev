import { mkdir, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { type as platformType } from 'node:os'
import { execaCommand } from '../system/execa.js'
import plist from 'simple-plist'
import { INSTALL_DIR } from './constants.js'
import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

interface PlistModule {
  readFileSync: <T>(path: string) => T
  writeBinaryFileSync: (path: string, data: unknown) => void
}

const NC_PREFS_PLIST = 'com.apple.ncprefs.plist'
const DISK_AGENT_NC_PREF_ID =
  '_SYSTEM_CENTER_:com.apple.DiskArbitration.DiskArbitrationAgent'

export default async function* ejectfix(
  _args: Record<string, unknown>,
  prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  yield { type: 'step:start', message: 'Beginning setup...' }

  const OS = platformType().toLowerCase()
  if (OS !== 'darwin') {
    yield { type: 'step:fail', message: `OS "${OS}" not supported` }
    return
  }

  const PREFS_DIR = resolve(
    process.env.HOME ?? '~',
    'Library',
    'Preferences',
  )
  const PREFS_BACKUP_DIR = resolve(INSTALL_DIR, 'ejectfix')
  const NC_PREFS_PATH = resolve(PREFS_DIR, NC_PREFS_PLIST)

  try {
    await mkdir(PREFS_BACKUP_DIR, { recursive: true })
  } catch (error) {
    yield {
      type: 'step:fail',
      message: `Error creating backup directory: ${String(error)}`,
    }
    return
  }

  const backupPath = resolve(PREFS_BACKUP_DIR, NC_PREFS_PLIST)
  if (existsSync(backupPath)) {
    yield { type: 'info', message: 'A backup of your notification preferences already exists.' }
    const shouldContinue = await prompter.confirm(
      'Would you like to override this backup and continue?',
    )
    if (!shouldContinue) {
      yield { type: 'info', message: 'Cancelling ejectfix setup.' }
      return
    }
  }

  if (!existsSync(NC_PREFS_PATH)) {
    yield {
      type: 'step:fail',
      message: `Cannot find notification preferences file: ${NC_PREFS_PATH}`,
    }
    return
  }

  try {
    yield { type: 'info', message: 'Backing up notification preferences' }
    await copyFile(NC_PREFS_PATH, backupPath)
  } catch (error) {
    yield {
      type: 'step:fail',
      message: `Error copying notification preferences: ${String(error)}`,
    }
    return
  }

  try {
    yield { type: 'info', message: 'Updating notification preferences' }
    const prefs = (plist as unknown as PlistModule).readFileSync<{
      apps: Array<{ 'bundle-id': string; flags: number }>
    }>(NC_PREFS_PATH)
    for (const app of prefs.apps) {
      if (app['bundle-id'] === DISK_AGENT_NC_PREF_ID) {
        app.flags = (Number(app.flags) & ~0b00010000) | 0b01001000
      }
    }
    (plist as unknown as PlistModule).writeBinaryFileSync(NC_PREFS_PATH, prefs)
  } catch (error) {
    yield {
      type: 'step:fail',
      message: `Unable to update notification preferences: ${String(error)}`,
    }
    return
  }

  try {
    yield { type: 'info', message: 'Restarting notification services' }
    await execaCommand('killall usernoted cfprefsd', { reject: false })
    yield {
      type: 'step:done',
      message: 'Successfully updated notification preferences for `DISK NOT EJECTED PROPERLY` warning!',
    }
  } catch (error) {
    yield {
      type: 'step:fail',
      message: `Error restarting services: ${String(error)}`,
    }
  }
}
