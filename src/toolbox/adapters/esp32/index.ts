import { mkdir, readFile } from 'node:fs/promises'
import { existsSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { execaCommand, execa } from 'execa'
import { INSTALL_DIR, EXPORTS_FILE_PATH, INSTALL_PATH } from '../../setup/constants.js'
import { moddableExists, getModdableVersion } from '../../setup/moddable.js'
import upsert from '../../patching/upsert.js'
import { replace as replaceInFile } from '../../patching/replace.js'
import { installMacDeps } from './mac.js'
import { installLinuxDeps } from './linux.js'
import { installWinDeps } from './windows.js'
import { setEnv } from '../../setup/windows.js'
import { sourceEnvironment } from '../../system/exec.js'
import { unwrapOr } from '../../system/errors.js'
import type { TargetAdapter, AdapterContext, VerifyResult } from '../interface.js'
import type { OperationEvent } from '../../../lib/events.js'
import type { Prompter } from '../../../lib/prompter.js'

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

interface Esp32Manifest {
  build?: { EXPECTED_ESP_IDF?: string }
}

export async function getExpectedEspIdfVersion(): Promise<string | null> {
  if (moddableExists()) {
    try {
      const manifestPath = resolve(INSTALL_PATH, 'build', 'devices', 'esp32', 'manifest.json')
      if (existsSync(manifestPath)) {
        const content = await readFile(manifestPath, 'utf-8')
        const parsed = JSON.parse(content) as Esp32Manifest
        return parsed.build?.EXPECTED_ESP_IDF ?? null
      }
    } catch {
      return null
    }
  }
  return null
}

export const esp32Adapter: TargetAdapter = {
  name: 'esp32',
  platforms: ['mac', 'lin', 'win'],

  async *install(ctx: AdapterContext, prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    yield { type: 'step:start', message: 'Setting up esp32 tools' }

    const isWindows = ctx.platform === 'win'
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
        const moddableVersionResult = await getModdableVersion()
        const moddableVersion = unwrapOr(moddableVersionResult, '')
        const expectedEspIdfVersion = await getExpectedEspIdfVersion()
        const branch =
          expectedEspIdfVersion ??
          ((moddableVersion.includes('branch') || getVersionSatisfies(moddableVersion, '>= 4.2.x'))
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

      if (ctx.platform === 'mac') {
        for await (const event of installMacDeps(prompter)) {
          yield event
        }
      }

      if (ctx.platform === 'lin') {
        for await (const event of installLinuxDeps(prompter)) {
          yield event
        }
      }

      if (isWindows) {
        for await (const event of installWinDeps(prompter)) {
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
        if (typeof process.env.IDF_PATH !== 'string' || process.env.IDF_PATH.length === 0) {
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
          shell: process.env.SHELL ?? '/bin/bash',
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
  },

  async *update(ctx: AdapterContext, prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
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

    // 1. ensure esp32 directories exist
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
          ((moddableVersion.includes('branch') || getVersionSatisfies(moddableVersion, '>= 4.2.x'))
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

      if (ctx.platform === 'mac') {
        for await (const event of installMacDeps(prompter)) {
          yield event
        }
      }

      if (ctx.platform === 'lin') {
        for await (const event of installLinuxDeps(prompter)) {
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
  },

  async *teardown(_ctx: AdapterContext, _prompter: Prompter): AsyncGenerator<OperationEvent, void, undefined> {
    try {
      yield { type: 'step:start', message: 'Removing esp32 tooling' }
      rmSync(join(INSTALL_DIR, 'esp32'), { recursive: true, force: true })
      rmSync(join(INSTALL_DIR, 'esp'), { recursive: true, force: true })
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error removing esp32 tooling: ${String(error)}` }
    }
  },

  async verify(_ctx: AdapterContext): Promise<VerifyResult> {
    const missing: string[] = []

    if (process.env.IDF_PATH === undefined || process.env.IDF_PATH === '') {
      missing.push('IDF_PATH env var not set')
    } else if (!existsSync(process.env.IDF_PATH)) {
      missing.push(`IDF_PATH path does not exist: ${process.env.IDF_PATH}`)
    }

    if (missing.length > 0) {
      return { ok: false, adapter: 'esp32', missing }
    }

    return { ok: true, adapter: 'esp32' }
  },

  getEnvVars(_ctx: AdapterContext): Record<string, string> {
    return {
      IDF_PATH: resolve(INSTALL_DIR, 'esp32', 'esp-idf'),
    }
  },

  getActivationScript(_ctx: AdapterContext): string | null {
    const idfPath = process.env.IDF_PATH
    if (idfPath === undefined || idfPath === '') {
      return null
    }
    return resolve(idfPath, 'export.sh')
  },
}
