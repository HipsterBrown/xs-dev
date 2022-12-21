import { print, prompt, system } from "gluegun";
import upsert from "../patching/upsert";
import { getProfilePath } from "./constants";

export async function ensureHomebrew(): Promise<void> {
  if (system.which('brew') === null) {
    const shouldInstallBrew = await prompt.confirm(`The "brew" command is not available. Homebrew is required to install necessary dependencies. Would you like to setup Homebrew automatically?`)

    if (shouldInstallBrew) {
      try {
        print.info('Running Homebrew install script...')
        await system.exec(`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`, {
          shell: process.env.SHELL,
          stdout: process.stdout,
          stdin: process.stdin,
        })
        const homebrewEval = `eval "$(/opt/homebrew/bin/brew shellenv)"`
        const PROFILE_PATH = getProfilePath()
        await upsert(PROFILE_PATH, homebrewEval)
        await system.exec(`source ${PROFILE_PATH}`, { shell: process.env.SHELL, stdout: process.stdout })
        return;
      } catch (error: unknown) {
        if (error instanceof Error) {
          print.error(`Unable to install Homebrew: ${error.message}`)
        }
      }
    }

    print.info(`Visit https://brew.sh/ to learn more about installing Homebrew. If you don't want to use Homebrew, please install python, cmake, ninja, and dfu-util manually before trying this command again.`)
    process.exit(1);
  }
}
