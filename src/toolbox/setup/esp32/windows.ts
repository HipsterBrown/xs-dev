import { createWriteStream, statSync } from 'node:fs'
import { promisify } from 'node:util'
import { finished } from 'node:stream'
import { resolve } from 'node:path'
import { execaCommand } from 'execa'
import type { OperationEvent } from '../../../lib/events.js'
import { fetchStream } from '../../system/fetch'

const finishedPromise = promisify(finished)

const IDF_INSTALLER =
  'https://github.com/espressif/idf-installer/releases/download/online-2.15/esp-idf-tools-setup-online-2.15.exe'

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function esp32Exists(): boolean {
  return (
    process.env.IDF_PATH !== undefined &&
    process.env.IDF_TOOLS_PATH !== undefined &&
    isDirectory(process.env.IDF_TOOLS_PATH) &&
    isDirectory(process.env.IDF_PATH)
  )
}

export async function* installDeps(
  ESP32_DIR: string,
  IDF_PATH: string,
): AsyncGenerator<OperationEvent> {
  if (esp32Exists()) {
    yield { type: 'info', message: `ESP-IDF tooling exists at ${process.env.IDF_PATH ?? ''}` }
    return
  }

  try {
    yield { type: 'step:start', message: 'Downloading ESP-IDF Tools Installer' }
    const destination = resolve(
      ESP32_DIR,
      'esp-idf-tools-setup-online-2.15.exe',
    )
    const writer = createWriteStream(destination)
    const download = await fetchStream(IDF_INSTALLER)
    download.pipe(writer)
    await finishedPromise(writer)
    yield { type: 'step:done' }

    yield { type: 'info', message: `When prompted, select "Use an Existing ESP-IDF Directory" and choose ${IDF_PATH}.` }
    yield { type: 'info', message: 'The "Full Installation" option is recommended.' }
    yield { type: 'step:start', message: 'Running ESP-IDF Tools Installer' }
    await execaCommand(`start /B ${destination}`)
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error installing ESP-IDF tools: ${String(error)}` }
  }
}
