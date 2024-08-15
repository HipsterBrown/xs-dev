import { type GluegunPrint, print, system } from "gluegun"

export async function installPython(spinner: ReturnType<GluegunPrint['spin']>): Promise<void> {
  if (system.which('python') === null) {
    // For some reason, system.which does not work with winget. This is a workaround for now.
    try {
      await system.exec('where winget')
    } catch (error) {
      print.error('Python 2.7 is required.')
      print.info('You can download and install Python from python.org/downloads')
      print.info('Or xs-dev can manage installing Python and other dependencies using the Windows Package Manager Client (winget).')
      print.info('You can install winget via the App Installer package in the Microsoft Store.')
      print.info('Please install either Python or winget, then launch a new Command Prompt and re-run this setup.')
      throw new Error("Python is required")
    }

    spinner.start('Installing python from winget')
    await system.exec('winget install -e --id Python.Python.2 --silent')
    spinner.succeed()
    print.info('Python successfully installed. Please close this window and launch a new Moddable Command Prompt to refresh environment variables, then re-run this setup.')
    throw new Error("Command Prompt restart needed")
  }
}

