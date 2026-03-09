import { renameSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { finished } from 'node:stream'
import { Extract as ZipExtract } from 'unzip-stream'
import { promisify } from 'node:util'
import { addToPath, setEnv } from '../windows'
import { INSTALL_DIR } from '../constants'
import { which } from '../../system/exec'
import { fetchStream } from '../../system/fetch'
import { execaCommand } from '../../system/execa.js'
import type { Prompter } from '../../../lib/prompter.js'
import type { OperationEvent } from '../../../lib/events.js'

const finishedPromise = promisify(finished)

const ESP_TOOL =
  'https://github.com/igrr/esptool-ck/releases/download/0.4.13/esptool-0.4.13-win32.zip'
const ESP_TOOL_VERSION = 'esptool-0.4.13-win32'
const CYGWIN = `https://github.com/Moddable-OpenSource/tools/releases/download/v1.0.0/cygwin.win32.zip`

async function* installPython(prompter: Prompter): AsyncGenerator<OperationEvent> {
  if (which('python') === null) {
    try {
      await execaCommand('where winget')
    } catch (error) {
      yield {
        type: 'info',
        message:
          'Python is required. You can download it from python.org/downloads or install via Windows Package Manager (winget).',
      }
      yield {
        type: 'info',
        message:
          'Install winget from the Microsoft Store if needed, then re-run this setup.',
      }
      yield {
        type: 'step:fail',
        message: 'Python is required',
      }
      return
    }

    try {
      yield { type: 'step:start', message: 'Installing python from winget' }
      await execaCommand('winget install -e --id Python.Python.3 --silent')
      yield { type: 'step:done' }
      yield {
        type: 'info',
        message:
          'Python installed. Please close this window, launch a new Command Prompt, and re-run setup.',
      }
    } catch (error) {
      yield {
        type: 'step:fail',
        message: `Error installing Python: ${String(error)}`,
      }
    }
  }
}

export async function* installDeps(prompter: Prompter): AsyncGenerator<OperationEvent> {
  try {
    const ESP_DIR = INSTALL_DIR
    const ESP_TOOL_DIR = resolve(ESP_DIR, ESP_TOOL_VERSION)
    const ESP_TOOL_EXE = resolve(ESP_TOOL_DIR, 'esptool.exe')
    const ESP_TOOL_DESTINATION = resolve(ESP_DIR, 'esptool.exe')
    const CYGWIN_BIN = resolve(ESP_DIR, 'cygwin', 'bin')

    yield { type: 'step:start', message: 'Downloading ESP Tool' }
    const writer = ZipExtract({ path: ESP_DIR })
    const download = await fetchStream(ESP_TOOL)
    download.pipe(writer)
    await finishedPromise(writer)
    renameSync(ESP_TOOL_EXE, ESP_TOOL_DESTINATION)
    rmSync(ESP_TOOL_DIR, { recursive: true, force: true })
    yield { type: 'step:done' }

    yield { type: 'step:start', message: 'Downloading Cygwin toolchain support package' }
    const cygwinWriter = ZipExtract({ path: ESP_DIR })
    const cygwinDownload = await fetchStream(CYGWIN)
    cygwinDownload.pipe(cygwinWriter)
    await finishedPromise(cygwinWriter)
    yield { type: 'step:done' }

    yield { type: 'step:start', message: 'Setting environment variables' }
    await setEnv('BASE_DIR', INSTALL_DIR)
    await addToPath(CYGWIN_BIN)
    yield { type: 'step:done' }

    for await (const event of installPython(prompter)) {
      yield event
    }

    if (which('pip') === null) {
      try {
        yield { type: 'step:start', message: 'Installing pip through ensurepip' }
        await execaCommand('python -m ensurepip')
        yield { type: 'step:done' }
      } catch (error) {
        yield {
          type: 'warning',
          message: `Error installing pip: ${String(error)}`,
        }
      }
    }

    try {
      yield { type: 'step:start', message: 'Installing pyserial through pip' }
      await execaCommand('python -m pip install pyserial')
      yield { type: 'step:done' }
    } catch (error) {
      yield {
        type: 'warning',
        message: `Error installing pyserial: ${String(error)}`,
      }
    }
  } catch (error) {
    yield {
      type: 'step:fail',
      message: `Error installing esp8266 dependencies: ${String(error)}`,
    }
  }
}
