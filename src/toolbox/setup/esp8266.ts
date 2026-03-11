import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { type as platformType } from 'node:os'
import { finished } from 'node:stream'
import { promisify } from 'node:util'
import { execaCommand } from 'execa'
import { extract } from 'tar-fs'
import { createGunzip } from 'node:zlib'
import { Extract as ZipExtract } from 'unzip-stream'
import { INSTALL_DIR, EXPORTS_FILE_PATH } from './constants.js'
import { moddableExists } from './moddable.js'
import upsert from '../patching/upsert.js'
import { installDeps as installMacDeps } from './esp8266/mac.js'
import { installDeps as installLinuxDeps } from './esp8266/linux.js'
import { installDeps as installWindowsDeps } from './esp8266/windows.js'
import { DEVICE_ALIAS } from '../prompt/devices.js'
import type { Device } from '../../types.js'
import { sourceEnvironment } from '../system/exec.js'
import { fetchStream } from '../system/fetch.js'
import type { Prompter } from '../../lib/prompter.js'
import type { OperationEvent } from '../../lib/events.js'

const finishedPromise = promisify(finished)

export default async function* esp8266Setup(
  args: Record<string, unknown>,
  prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  yield { type: 'step:start', message: 'Setting up esp8266 tools' }

  const OS = platformType().toLowerCase() as Device
  const isWindows = OS === 'windows_nt'
  const TOOLCHAIN = `https://github.com/Moddable-OpenSource/tools/releases/download/v1.0.0/esp8266.toolchain.${isWindows ? 'win32' : OS}.${isWindows ? 'zip' : 'tgz'}`
  const ARDUINO_CORE =
    'https://github.com/esp8266/Arduino/releases/download/2.3.0/esp8266-2.3.0.zip'
  const ESP_RTOS_REPO = 'https://github.com/espressif/ESP8266_RTOS_SDK.git'
  const ESP_BRANCH = 'release/v3.2'
  const ESP_DIR = resolve(INSTALL_DIR, 'esp')
  const RTOS_PATH = resolve(ESP_DIR, 'ESP8266_RTOS_SDK')
  const TOOLCHAIN_PATH = resolve(ESP_DIR, 'toolchain')
  const ARDUINO_CORE_PATH = resolve(ESP_DIR, 'esp8266-2.3.0')

  await sourceEnvironment()

  // 0. ensure Moddable exists
  if (!moddableExists()) {
    yield { type: 'step:fail', message: `Moddable tooling required. Run 'xs-dev setup --device ${DEVICE_ALIAS[OS]}' before trying again.` }
    return
  }


  // 1. ensure ~/.local/share/esp directory
  try {
    yield { type: 'info', message: 'Ensuring esp8266 directory' }
    await mkdir(ESP_DIR, { recursive: true })
  } catch (error) {
    yield { type: 'step:fail', message: `Error creating esp8266 directory: ${String(error)}` }
    return
  }

  // 2. download and untar xtensa toolchain
  if (!existsSync(TOOLCHAIN_PATH)) {
    try {
      yield { type: 'step:start', message: 'Downloading xtensa toolchain' }

      if (isWindows) {
        const writer = ZipExtract({ path: ESP_DIR })
        const download = await fetchStream(TOOLCHAIN)
        download.pipe(writer)
        await finishedPromise(writer)
      } else {
        const writer = extract(ESP_DIR, { readable: true })
        const gunzip = createGunzip()
        const download = await fetchStream(TOOLCHAIN)
        download.pipe(gunzip).pipe(writer)
        await finishedPromise(writer)
      }
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error downloading toolchain: ${String(error)}` }
      return
    }
  }

  // 3. download and unzip esp8266 core for arduino
  if (!existsSync(ARDUINO_CORE_PATH)) {
    try {
      yield { type: 'step:start', message: 'Downloading arduino core tooling' }
      const writer = ZipExtract({ path: ESP_DIR })
      const download = await fetchStream(ARDUINO_CORE)
      download.pipe(writer)
      await finishedPromise(writer)
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error downloading arduino core: ${String(error)}` }
      return
    }
  }

  // 4. clone esp8266 RTOS SDK
  if (!existsSync(RTOS_PATH)) {
    try {
      yield { type: 'step:start', message: 'Cloning esp8266 RTOS SDK repo' }
      await execaCommand(
        `git clone --depth 1 --single-branch -b ${ESP_BRANCH} ${ESP_RTOS_REPO} ${RTOS_PATH}`,
      )
      yield { type: 'step:done' }
    } catch (error) {
      yield { type: 'step:fail', message: `Error cloning RTOS SDK: ${String(error)}` }
      return
    }
  }

  // 5. ensure python, pip, and pyserial are installed
  try {
    if (OS === 'darwin') {
      for await (const event of installMacDeps(prompter)) {
        yield event
      }
    }

    if (OS === 'linux') {
      for await (const event of installLinuxDeps(prompter)) {
        yield event
      }
    }

    if (isWindows) {
      for await (const event of installWindowsDeps(prompter)) {
        yield event
      }
    }
  } catch (error) {
    yield { type: 'step:fail', message: `Windows dependencies failed to install. Please review the information above.` }
    return
  }

  // 6. create ESP_BASE env export in shell profile
  try {
    if (OS === 'darwin' || OS === 'linux') {
      if (process.env.ESP_BASE === undefined) {
        yield { type: 'info', message: 'Configuring $ESP_BASE' }
        process.env.ESP_BASE = ESP_DIR
        await upsert(EXPORTS_FILE_PATH, `export ESP_BASE=${process.env.ESP_BASE}`)
      }
    }
  } catch (error) {
    yield { type: 'step:fail', message: `Error configuring ESP_BASE: ${String(error)}` }
    return
  }

  yield {
    type: 'step:done',
    message: `Successfully set up esp8266 platform support for Moddable!
Test out the setup by starting a new ${isWindows ? 'Moddable Command Prompt' : 'terminal session'}, plugging in your device, and running: xs-dev run --example helloworld --device esp8266
If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the "/dev.cu.*" that matches your device.`,
  }
}
