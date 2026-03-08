import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { type as platformType } from 'node:os'
import { execaCommand } from '../system/execa.js'
import { INSTALL_DIR, EXPORTS_FILE_PATH, INSTALL_PATH } from './constants'
import { moddableExists, getModdableVersion } from './moddable'
import upsert from '../patching/upsert'
import { installDeps as installMacDeps } from './esp32/mac'
import { installDeps as installLinuxDeps } from './esp32/linux'
import { installDeps as installWinDeps } from './esp32/windows'
import { setEnv } from './windows'
import { sourceEnvironment } from '../system/exec'
import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

function getVersionSatisfies(version: string, range: string): boolean {
  const major = parseInt(version.split('.')[0], 10)
  if (range === '>= 4.2.x') return major >= 4
  return false
}

export default async function* esp32Setup(
  args: Record<string, unknown>,
  prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  yield { type: 'step:start', message: 'Setting up esp32 tools' }

  const OS = platformType().toLowerCase()
  const isWindows = OS === 'windows_nt'
  const ESP_IDF_REPO = 'https://github.com/espressif/esp-idf.git'
  const ESP_BRANCH_V4 = 'v4.4.3'
  const ESP_BRANCH_V5 = 'v5.5'
  const ESP32_DIR = resolve(INSTALL_DIR, 'esp32')
  const IDF_PATH = resolve(ESP32_DIR, 'esp-idf')

  await sourceEnvironment()

  // 0. ensure Moddable exists
  if (!moddableExists()) {
    yield { type: 'step:fail', message: 'Moddable tooling required. Run `xs-dev setup` before trying again.' }
    return
  }

  // Windows-specific setup already handled by setEnv

  // 1. ensure ~/.local/share/esp32 directory
  try {
    yield { type: 'info', message: 'Ensuring esp32 install directory' }
    await mkdir(ESP32_DIR, { recursive: true })
  } catch (error) {
    yield { type: 'step:fail', message: `Error creating esp32 directory: ${String(error)}` }
    return
  }

  // 2. clone esp-idf into ~/.local/share/esp32/esp-idf
  if (!existsSync(IDF_PATH)) {
    try {
      yield { type: 'step:start', message: 'Cloning esp-idf repo' }
      const moddableVersion = await getModdableVersion()
      const expectedEspIdfVersion = await getExpectedEspIdfVersion()
      const branch =
        expectedEspIdfVersion ??
        (((moddableVersion ?? '').includes('branch') || getVersionSatisfies(moddableVersion ?? '', '>= 4.2.x'))
          ? ESP_BRANCH_V5
          : ESP_BRANCH_V4)
      await execaCommand(
        `git clone --depth 1 --single-branch -b ${branch} --recursive ${ESP_IDF_REPO} ${IDF_PATH}`,
      )
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error cloning esp-idf: ${String(error)}` }
      return
    }
  }

  // 3. Install build and run dependencies
  try {
    yield { type: 'step:start', message: 'Installing build dependencies' }

    if (OS === 'darwin') {
      for await (const event of installMacDeps(prompter)) {
        yield event
      }
    }

    if (OS === 'linux') {
      for await (const event of installLinuxDeps()) {
        yield event
      }
    }

    if (isWindows) {
      for await (const event of installWinDeps(ESP32_DIR, IDF_PATH)) {
        yield event
      }
    }

    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error installing dependencies: ${String(error)}` }
    return
  }

  // 4. append IDF_PATH env export to shell profile
  try {
    if (isWindows) {
      yield { type: 'info', message: 'Configuring IDF_PATH environment variable' }
      await setEnv('IDF_PATH', IDF_PATH)
    } else {
      if (!process.env.IDF_PATH) {
        yield { type: 'info', message: 'Configuring $IDF_PATH' }
        process.env.IDF_PATH = IDF_PATH
        await upsert(EXPORTS_FILE_PATH, `export IDF_PATH=${IDF_PATH}`)
      }
    }
  } catch (error) {
    yield { type: 'step:fail', message: `Error configuring IDF_PATH: ${String(error)}` }
    return
  }

  // 5. cd to IDF_PATH, run install.sh
  try {
    if (isWindows) {
      yield { type: 'step:start', message: 'Running ESP-IDF Tools install.bat' }
      await execaCommand(`${IDF_PATH}\\install.bat`, {
        cwd: IDF_PATH,
        stdio: 'inherit',
      })
      yield { type: 'step:done' }
    } else {
      yield { type: 'step:start', message: 'Installing esp-idf tooling' }
      await execaCommand('./install.sh', {
        cwd: IDF_PATH,
        shell: process.env.SHELL || '/bin/bash',
        stdio: 'inherit',
      })
      yield { type: 'step:done' }
    }
  } catch (error) {
    yield { type: 'step:fail', message: `Error running install script: ${String(error)}` }
    return
  }

  // 6. append 'source $IDF_PATH/export.sh' to shell profile
  try {
    if (isWindows) {
      await upsert(
        EXPORTS_FILE_PATH,
        `pushd %IDF_PATH% && call "%IDF_TOOLS_PATH%\\idf_cmd_init.bat" && popd`,
      )
    }
  } catch (error) {
    yield { type: 'step:fail', message: `Error updating shell profile: ${String(error)}` }
    return
  }

  yield {
    type: 'step:done',
    message: `Successfully set up esp32 platform support for Moddable!
Test out the setup by starting a new ${isWindows ? 'Moddable Command Prompt' : 'terminal session'}, plugging in your device, and running: xs-dev run --example helloworld --device=esp32
If there is trouble finding the correct port, pass the "--port" flag to the above command with the ${isWindows ? 'COM Port' : 'path to the /dev.cu.*'} that matches your device.`,
  }
}

export async function getExpectedEspIdfVersion(): Promise<string | null> {
  if (moddableExists()) {
    try {
      const manifestPath = resolve(INSTALL_PATH, 'build', 'devices', 'esp32', 'manifest.json')
      if (existsSync(manifestPath)) {
        const { readFile } = await import('node:fs/promises')
        const content = await readFile(manifestPath, 'utf-8')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const manifest = JSON.parse(content) as Record<string, any>
        return (manifest?.build?.EXPECTED_ESP_IDF as string | undefined) ?? null
      }
    } catch {
      return null
    }
  }
  return null
}
