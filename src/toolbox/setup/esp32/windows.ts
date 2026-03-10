import { createWriteStream, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { finished } from 'node:stream'
import { execaCommand } from '../../system/execa.js'
import { fetchStream } from '../../system/fetch.js'
import type { Prompter } from '../../../lib/prompter.js'
import type { OperationEvent } from '../../../lib/events.js'

const finishedPromise = promisify(finished)

const IDF_INSTALLER =
  'https://github.com/espressif/idf-installer/releases/download/online-2.15/esp-idf-tools-setup-online-2.15.exe'

export async function* installDeps(prompter: Prompter): AsyncGenerator<OperationEvent> {
  if (esp32Exists()) {
    yield {
      type: 'info',
      message: `ESP-IDF tooling exists at ${process.env.IDF_PATH ?? ''}`,
    }
    return
  }

  try {
    const ESP32_DIR = process.env.INSTALL_DIR ?? ''
    if (typeof ESP32_DIR !== 'string' || ESP32_DIR.length === 0) {
      yield { type: 'step:fail', message: 'INSTALL_DIR environment variable not set' }
      return
    }

    yield { type: 'step:start', message: 'Downloading ESP-IDF Tools Installer' }
    const destination = resolve(ESP32_DIR, 'esp-idf-tools-setup-online-2.15.exe')
    const writer = createWriteStream(destination)
    const download = await fetchStream(IDF_INSTALLER)
    download.pipe(writer)
    await finishedPromise(writer)
    yield { type: 'step:done' }

    yield {
      type: 'info',
      message: `When prompted, select "Use an Existing ESP-IDF Directory". The "Full Installation" option is recommended.`,
    }

    yield { type: 'step:start', message: 'Running ESP-IDF Tools Installer' }
    await execaCommand(`start /B ${destination}`)
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error installing ESP-IDF tools: ${String(error)}` }
  }
}

export function esp32Exists(): boolean {
  return (
    process.env.IDF_PATH !== undefined &&
    process.env.IDF_TOOLS_PATH !== undefined &&
    existsSync(process.env.IDF_TOOLS_PATH) &&
    existsSync(process.env.IDF_PATH)
  )
}
