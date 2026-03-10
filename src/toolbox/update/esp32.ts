import { type as platformType } from 'node:os'
import { execaCommand, execa } from '../system/execa.js'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from '../setup/constants.js'
import { getModdableVersion, moddableExists } from '../setup/moddable.js'
import { unwrapOr } from '../system/errors.js'
import upsert from '../patching/upsert.js'
import { installDeps as installMacDeps } from '../setup/esp32/mac.js'
import { installDeps as installLinuxDeps } from '../setup/esp32/linux.js'
import { getExpectedEspIdfVersion } from '../setup/esp32.js'
import { sourceEnvironment } from '../system/exec.js'
import { replace as replaceInFile } from '../patching/replace.js'
import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

function getVersionSatisfies(version: string, range: string): boolean {
  const major = parseInt(version.split('.')[0], 10)
  if (range === '>= 4.2.x') return major >= 4
  if (range === '>= 4.3.8') {
    const minor = parseInt(version.split('.')[1] ?? '0', 10)
    const patch = parseInt(version.split('.')[2] ?? '0', 10)
    return major > 4 || (major === 4 && minor > 3) || (major === 4 && minor === 3 && patch >= 8)
  }
  return false
}

export default async function* updateEsp32(
  _args: Record<string, unknown>,
  _prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  const OS = platformType().toLowerCase()
  const ESP_BRANCH_V4 = 'v4.4.3'
  const ESP_BRANCH_V5 = 'v5.5'
  const ESP32_DIR = resolve(INSTALL_DIR, 'esp32')
  const IDF_PATH = resolve(ESP32_DIR, 'esp-idf')

  await sourceEnvironment()

  yield { type: 'step:start', message: 'Updating esp32 tools' }

  // 0. ensure Moddable exists
  if (!moddableExists()) {
    yield {
      type: 'step:fail',
      message: 'Moddable tooling required. Run `xs-dev setup` before trying again.',
    }
    return
  }

  // 1. ensure ~/.local/share/esp32 directory
  yield { type: 'info', message: 'Ensuring esp32 install directory' }
  if (!existsSync(ESP32_DIR) || !existsSync(IDF_PATH)) {
    yield {
      type: 'step:fail',
      message: 'ESP32 tooling required. Run `xs-dev setup --device esp32` before trying again.',
    }
    return
  }

  // 2. update local esp-idf repo
  if (existsSync(IDF_PATH)) {
    try {
      yield { type: 'step:start', message: 'Updating esp-idf repo' }
      const moddableVersionResult = await getModdableVersion()
      const moddableVersion = unwrapOr(moddableVersionResult, '')
      const expectedEspIdfVersion = await getExpectedEspIdfVersion()
      const branch =
        expectedEspIdfVersion ??
        (((moddableVersion.includes('branch')) || getVersionSatisfies(moddableVersion, '>= 4.2.x'))
          ? ESP_BRANCH_V5
          : ESP_BRANCH_V4)

      if (
        branch === ESP_BRANCH_V5 &&
        !getVersionSatisfies(moddableVersion, '>= 4.3.8' as const)
      ) {
        yield {
          type: 'step:fail',
          message: 'Latest Moddable SDK is required before updating ESP-IDF. Run `xs-dev update` before trying again.',
        }
        return
      }

      await execaCommand('git fetch --all --tags', { cwd: IDF_PATH })
      await execaCommand(`git checkout ${branch}`, { cwd: IDF_PATH })
      await execaCommand('git submodule update --init --recursive', {
        cwd: IDF_PATH,
      })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error updating esp-idf: ${String(error)}` }
      return
    }
  }

  // 3. Install build and run dependencies
  try {
    yield { type: 'step:start', message: 'Installing build dependencies' }

    if (OS === 'darwin') {
      for await (const event of installMacDeps(_prompter)) {
        yield event
      }
    }

    if (OS === 'linux') {
      for await (const event of installLinuxDeps(_prompter)) {
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
    if (process.env.IDF_PATH === undefined) {
      yield { type: 'info', message: 'Configuring $IDF_PATH' }
      process.env.IDF_PATH = IDF_PATH
      await upsert(EXPORTS_FILE_PATH, `export IDF_PATH=${IDF_PATH}`)
    }
  } catch (error) {
    yield { type: 'step:fail', message: `Error configuring IDF_PATH: ${String(error)}` }
    return
  }

  // remove sourced IDF_PATH/export settings before install
  // https://github.com/espressif/esp-idf/issues/8314#issuecomment-1024881587
  try {
    await replaceInFile(
      EXPORTS_FILE_PATH,
      `source $IDF_PATH/export.sh 1> /dev/null\n`,
      '',
    )
    await execaCommand(`source ${EXPORTS_FILE_PATH}`, {
      shell: process.env.SHELL ?? '/bin/bash',
    })
  } catch (error) {
    yield { type: 'info', message: `Note: Could not remove old IDF_PATH source: ${String(error)}` }
  }

  // 5. cd to IDF_PATH, run install.sh
  try {
    yield { type: 'step:start', message: 'Rebuilding esp-idf tooling' }
    await execaCommand('./install.sh', {
      cwd: IDF_PATH,
      shell: process.env.SHELL ?? '/bin/bash',
      stdio: 'inherit',
    })
    yield { type: 'step:done' }
  } catch (error) {
    yield { type: 'step:fail', message: `Error running install script: ${String(error)}` }
    return
  }

  // 6. append 'source $IDF_PATH/export.sh' to shell profile
  try {
    yield { type: 'info', message: 'Sourcing esp-idf environment' }
    await upsert(EXPORTS_FILE_PATH, `source $IDF_PATH/export.sh 1> /dev/null\n`)
    await execaCommand('source $IDF_PATH/export.sh', {
      shell: process.env.SHELL ?? '/bin/bash',
    })
  } catch (error) {
    yield { type: 'info', message: `Note: ${String(error)}` }
  }

  // 7. Remove existing build output directories
  try {
    const BUILD_DIR = resolve(
      process.env.MODDABLE ?? '',
      'build',
      'bin',
      'esp32',
    )
    const TMP_DIR = resolve(
      process.env.MODDABLE ?? '',
      'build',
      'tmp',
      'esp32',
    )
    await execa('rm', ['-rf', BUILD_DIR], { reject: false })
    await execa('rm', ['-rf', TMP_DIR], { reject: false })
  } catch (error) {
    yield { type: 'info', message: `Note: Could not clean build dirs: ${String(error)}` }
  }

  yield {
    type: 'step:done',
    message: `Successfully updated esp32 platform support for Moddable!
Test out the setup by starting a new terminal session, plugging in your device, and running: xs-dev run --example helloworld --device=esp32
If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the "/dev.cu.*" that matches your device.`,
  }
}
