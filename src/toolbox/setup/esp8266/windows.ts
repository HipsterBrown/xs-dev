import { system, filesystem, print } from 'gluegun'
import { finished } from 'stream'
import axios from 'axios'
import type { GluegunPrint } from 'gluegun'
import { Extract as ZipExtract } from 'unzip-stream'
import { promisify } from 'util'
import { addToPath, setEnv } from '../windows'
import { INSTALL_DIR } from '../constants'

const finishedPromise = promisify(finished)

const ESP_TOOL = 'https://github.com/igrr/esptool-ck/releases/download/0.4.13/esptool-0.4.13-win32.zip'
const ESP_TOOL_VERSION = 'esptool-0.4.13-win32'
const CYGWIN = 'https://www.dropbox.com/s/ub7xehxbf747eu1/cygwin.win32.zip?dl=1'

export async function installPython(spinner: ReturnType<GluegunPrint['spin']>): Promise<void> {
    if (system.which('python') === null) {
        // For some reason, system.which does not work with winget. This is a workaround for now.
        try {
            await system.exec('where winget')
        } catch (error) {
            print.error('Python is required.')
            print.info('You can download and install Python from python.org/downloads')
            print.info('Or xs-dev can manage installing Python and other dependencies using the Windows Package Manager Client (winget).')
            print.info('You can install winget via the App Installer package in the Microsoft Store.')
            print.info('Please install either Python or winget, then launch a new Command Prompt and re-run this setup.')
            throw new Error("Python is required")
        }
        
        spinner.start('Installing python from winget')
        await system.exec('winget install -e --id Python.Python.3 --silent')
        spinner.succeed()
        print.info('Python successfully installed. Please close this window and launch a new Moddable Command Prompt to refresh environment variables, then re-run this setup.')
        throw new Error("Command Prompt restart needed")
    }
}

export async function installDeps(
  spinner: ReturnType<GluegunPrint['spin']>,
  ESP_DIR: string
): Promise<void> {
    const ESP_TOOL_DIR = filesystem.resolve(ESP_DIR, ESP_TOOL_VERSION)
    const ESP_TOOL_EXE = filesystem.resolve(ESP_TOOL_DIR, 'esptool.exe')
    const ESP_TOOL_DESTINATION = filesystem.resolve(ESP_DIR, 'esptool.exe')
    const CYGWIN_BIN = filesystem.resolve(ESP_DIR, "cygwin", "bin")

    spinner.start('Downloading ESP Tool')
    let writer = ZipExtract({path: ESP_DIR})
    let response = await axios.get(ESP_TOOL, {
        responseType: 'stream'
    })
    response.data.pipe(writer)
    await finishedPromise(writer)
    filesystem.move(ESP_TOOL_EXE, ESP_TOOL_DESTINATION, {overwrite: true})
    filesystem.remove(ESP_TOOL_DIR)
    spinner.succeed()

    spinner.start('Downloading Cygwin toolchain support package')
    writer = ZipExtract({path: ESP_DIR})
    response = await axios.get(CYGWIN, {
        responseType: 'stream'
    })
    response.data.pipe(writer)
    await finishedPromise(writer)
    spinner.succeed()

    spinner.start('Setting environment variables')
    await setEnv("BASE_DIR", INSTALL_DIR)
    await addToPath(CYGWIN_BIN)
    spinner.succeed()

    try {
        await installPython(spinner)
    } catch (error) { // Command Prompt restart needed
        process.exit(1)
    }
    
    if (system.which('pip') === null) {
        spinner.start('Installing pip through ensurepip')
        await system.exec('python -m ensurepip')
        spinner.succeed()
    }
    
    spinner.start('Installing pyserial through pip')
    await system.exec('python -m pip install pyserial')
    spinner.succeed()
}
