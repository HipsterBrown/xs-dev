import { filesystem, print, system } from 'gluegun'
import type { GluegunPrint } from 'gluegun'
import axios from 'axios'
import { promisify } from 'util'
import { finished } from 'stream'

const finishedPromise = promisify(finished)

const IDF_INSTALLER = 'https://github.com/espressif/idf-installer/releases/download/online-2.15/esp-idf-tools-setup-online-2.15.exe'

export async function installDeps(
    spinner: ReturnType<GluegunPrint['spin']>,
    ESP32_DIR: string,
    IDF_PATH: string
  ): Promise<void> {
    
    if (esp32Exists()) {
      print.info(`ESP-IDF tooling exists at ${process.env.IDF_PATH}`)
      return
    }
  
    spinner.start('Downloading ESP-IDF Tools Installer')
    const destination = filesystem.resolve(ESP32_DIR, 'esp-idf-tools-setup-online-2.15.exe')
    const writer = filesystem.createWriteStream(destination)
    const response = await axios.get(IDF_INSTALLER, {
        responseType: 'stream',
    })
    response.data.pipe(writer)
    await finishedPromise(writer)
    spinner.succeed()

    print.info(`When prompted, select "Use an Existing ESP-IDF Directory" and choose ${IDF_PATH}.`)
    print.info('The "Full Installation" option is recommended.')
    spinner.start('Running ESP-IDF Tools Installer')
    await system.exec(`start /B ${destination}`)
    spinner.succeed()
  }
  
  export function esp32Exists(): boolean {
    return (
      process.env.IDF_PATH !== undefined &&
      process.env.IDF_TOOLS_PATH !== undefined &&
      filesystem.exists(process.env.IDF_TOOLS_PATH) === 'dir' &&
      filesystem.exists(process.env.IDF_PATH) === 'dir'
    )
  }