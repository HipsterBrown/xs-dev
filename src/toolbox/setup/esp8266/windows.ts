import { execSync } from 'node:child_process'
import { finished } from 'node:stream'
import { promisify } from 'node:util'
import { rm, rename } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Extract as ZipExtract } from 'unzip-stream'
import { execaCommand } from '../../system/execa.js'
import { addToPath, setEnv } from '../windows'
import { INSTALL_DIR } from '../constants'
import { fetchStream } from '../../system/fetch'
import type { OperationEvent } from '../../../lib/events.js'

const finishedPromise = promisify(finished)

const ESP_TOOL =
  'https://github.com/igrr/esptool-ck/releases/download/0.4.13/esptool-0.4.13-win32.zip'
const ESP_TOOL_VERSION = 'esptool-0.4.13-win32'
const CYGWIN = `https://github.com/Moddable-OpenSource/tools/releases/download/v1.0.0/cygwin.win32.zip`

function which(bin: string): string | null {
  try {
    const result = execSync(`where ${bin}`, { stdio: 'pipe' }).toString().trim()
    return result.length > 0 ? result : null
  } catch {
    return null
  }
}

async function* installPython(): AsyncGenerator<OperationEvent> {
  if (which('python') === null) {
    // For some reason, which does not work with winget. This is a workaround for now.
    try {
      await execaCommand('where winget')
    } catch (error) {
      yield { type: 'step:fail', message: 'Python is required.' }
      yield { type: 'info', message: 'You can download and install Python from python.org/downloads' }
      yield { type: 'info', message: 'Or xs-dev can manage installing Python and other dependencies using the Windows Package Manager Client (winget).' }
      yield { type: 'info', message: 'You can install winget via the App Installer package in the Microsoft Store.' }
      yield { type: 'info', message: 'Please install either Python or winget, then launch a new Command Prompt and re-run this setup.' }
      return
    }

    try {
      yield { type: 'step:start', message: 'Installing python from winget' }
      await execaCommand('winget install -e --id Python.Python.3 --silent')
      yield { type: 'step:done' }
      yield { type: 'info', message: 'Python successfully installed. Please close this window and launch a new Moddable Command Prompt to refresh environment variables, then re-run this setup.' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error installing python: ${String(error)}` }
    }
  }
}

export async function* installDeps(
  ESP_DIR: string,
): AsyncGenerator<OperationEvent> {
  const ESP_TOOL_DIR = resolve(ESP_DIR, ESP_TOOL_VERSION)
  const ESP_TOOL_EXE = resolve(ESP_TOOL_DIR, 'esptool.exe')
  const ESP_TOOL_DESTINATION = resolve(ESP_DIR, 'esptool.exe')
  const CYGWIN_BIN = resolve(ESP_DIR, 'cygwin', 'bin')

  try {
    yield { type: 'step:start', message: 'Downloading ESP Tool' }
    const writer = ZipExtract({ path: ESP_DIR })
    const download = await fetchStream(ESP_TOOL)
    download.pipe(writer)
    await finishedPromise(writer)
    await rename(ESP_TOOL_EXE, ESP_TOOL_DESTINATION)
    await rm(ESP_TOOL_DIR, { recursive: true, force: true })
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error downloading ESP Tool: ${String(error)}` }
    return
  }

  try {
    yield { type: 'step:start', message: 'Downloading Cygwin toolchain support package' }
    const cygwinWriter = ZipExtract({ path: ESP_DIR })
    const cygwinDownload = await fetchStream(CYGWIN)
    cygwinDownload.pipe(cygwinWriter)
    await finishedPromise(cygwinWriter)
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error downloading Cygwin: ${String(error)}` }
    return
  }

  try {
    yield { type: 'step:start', message: 'Setting environment variables' }
    await setEnv('BASE_DIR', INSTALL_DIR)
    await addToPath(CYGWIN_BIN)
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error setting environment variables: ${String(error)}` }
    return
  }

  for await (const event of installPython()) {
    yield event
  }

  if (which('pip') === null) {
    try {
      yield { type: 'step:start', message: 'Installing pip through ensurepip' }
      await execaCommand('python -m ensurepip')
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error installing pip: ${String(error)}` }
      return
    }
  }

  try {
    yield { type: 'step:start', message: 'Installing pyserial through pip' }
    await execaCommand('python -m pip install pyserial')
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error installing pyserial: ${String(error)}` }
  }
}
