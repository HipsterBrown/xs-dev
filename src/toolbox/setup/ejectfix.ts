import { filesystem, print, prompt, system } from "gluegun";
import { INSTALL_DIR } from './constants'
import { type as platformType } from 'os'
import plist from 'simple-plist'

const NC_PREFS_PLIST = 'com.apple.ncprefs.plist'
const DISK_AGENT_NC_PREF_ID = '_SYSTEM_CENTER_:com.apple.DiskArbitration.DiskArbitrationAgent'

export default async function(): Promise<void> {
  const spinner = print.spin()
  spinner.start('Beginning setup...')

  const OS = platformType().toLowerCase()
  if (OS !== 'darwin') {
    print.error(`OS "${OS}" not supported`)
    process.exit(1)
  }

  const PREFS_DIR = filesystem.resolve(process.env.HOME ?? '~', 'Library', 'Preferences')
  const PREFS_BACKUP_DIR = filesystem.resolve(INSTALL_DIR, 'ejectfix')
  const NC_PREFS_PATH = filesystem.resolve(PREFS_DIR, NC_PREFS_PLIST)

  filesystem.dir(PREFS_BACKUP_DIR)

  if (filesystem.exists(filesystem.resolve(PREFS_BACKUP_DIR, NC_PREFS_PLIST)) !== false) {
    spinner.info('A backup of your notification preferences already exists.')
    const shouldContinue = await prompt.confirm('Would you like to override this backup and continue?')
    if (!shouldContinue) {
      print.info('Cancelling ejectfix setup.')
      process.exit(0)
    }
  }
  if (filesystem.exists(NC_PREFS_PATH) === false) {
    spinner.fail(`Cannot find notification preferences file: ${NC_PREFS_PATH}`)
    process.exit(1)
  }

  try {
    filesystem.copy(NC_PREFS_PATH, filesystem.resolve(PREFS_BACKUP_DIR, NC_PREFS_PLIST), { overwrite: true })
  } catch (error) {
    spinner.fail(`Error copying notification preferences: ${String(error)}`)
    process.exit(1)
  }

  try {
    const prefs = plist.readFileSync<{ apps: Array<{ 'bundle-id': string; 'flags': number }> }>(NC_PREFS_PATH)
    for (const app of prefs.apps) {
      if (app['bundle-id'] === DISK_AGENT_NC_PREF_ID) {
        app.flags = (Number(app.flags) & ~0b00010000) | 0b01001000
      }
    }
    plist.writeBinaryFileSync(NC_PREFS_PATH, prefs)
  } catch (error) {
    spinner.fail(`Unable to update notification preferences: ${String(error)}`)
    process.exit(1)
  }

  await system.exec('killall usernoted cfprefsd')
  spinner.succeed('Successfully updated notification preferences for `DISK NOT EJECTED PROPERLY` warning!')
}
