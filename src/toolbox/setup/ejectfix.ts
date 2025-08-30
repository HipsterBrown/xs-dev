import { filesystem, print, prompt, system } from 'gluegun'
import { INSTALL_DIR } from './constants'
import { type as platformType } from 'os'
import plist from 'simple-plist'
import type { Result } from '../../types'
import { success, failure, wrapAsync } from '../system/errors'

const NC_PREFS_PLIST = 'com.apple.ncprefs.plist'
const DISK_AGENT_NC_PREF_ID =
  '_SYSTEM_CENTER_:com.apple.DiskArbitration.DiskArbitrationAgent'

export default async function (): Promise<Result<void>> {
  const spinner = print.spin()
  spinner.start('Beginning setup...')

  const OS = platformType().toLowerCase()
  if (OS !== 'darwin') {
    spinner.fail(`OS "${OS}" not supported`)
    return failure(`OS "${OS}" not supported`)
  }

  const PREFS_DIR = filesystem.resolve(
    process.env.HOME ?? '~',
    'Library',
    'Preferences',
  )
  const PREFS_BACKUP_DIR = filesystem.resolve(INSTALL_DIR, 'ejectfix')
  const NC_PREFS_PATH = filesystem.resolve(PREFS_DIR, NC_PREFS_PLIST)

  filesystem.dir(PREFS_BACKUP_DIR)

  if (
    filesystem.exists(filesystem.resolve(PREFS_BACKUP_DIR, NC_PREFS_PLIST)) !==
    false
  ) {
    spinner.info('A backup of your notification preferences already exists.')
    const shouldContinue = await prompt.confirm(
      'Would you like to override this backup and continue?',
    )
    if (!shouldContinue) {
      spinner.info('Cancelling ejectfix setup.')
      return success(undefined)
    }
  }
  if (filesystem.exists(NC_PREFS_PATH) === false) {
    spinner.fail(`Cannot find notification preferences file: ${NC_PREFS_PATH}`)
    return failure(`Cannot find notification preferences file: ${NC_PREFS_PATH}`)
  }

  return await wrapAsync(async () => {
    try {
      filesystem.copy(
        NC_PREFS_PATH,
        filesystem.resolve(PREFS_BACKUP_DIR, NC_PREFS_PLIST),
        { overwrite: true },
      )
    } catch (error) {
      spinner.fail(`Error copying notification preferences: ${String(error)}`)
      throw new Error(`Error copying notification preferences: ${String(error)}`)
    }

    try {
      const prefs = plist.readFileSync<{
        apps: Array<{ 'bundle-id': string; flags: number }>
      }>(NC_PREFS_PATH)
      for (const app of prefs.apps) {
        if (app['bundle-id'] === DISK_AGENT_NC_PREF_ID) {
          app.flags = (Number(app.flags) & ~0b00010000) | 0b01001000
        }
      }
      plist.writeBinaryFileSync(NC_PREFS_PATH, prefs)
    } catch (error) {
      spinner.fail(`Unable to update notification preferences: ${String(error)}`)
      throw new Error(`Unable to update notification preferences: ${String(error)}`)
    }

    await system.exec('killall usernoted cfprefsd')
    spinner.succeed(
      'Successfully updated notification preferences for `DISK NOT EJECTED PROPERLY` warning!',
    )
  })
}
