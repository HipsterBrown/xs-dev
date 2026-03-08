import os from 'node:os'
import { existsSync, statSync, execSync } from 'node:fs'
import { join } from 'node:path'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../app'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'
import { getModdableVersion, moddableExists } from '../toolbox/setup/moddable'
import { sourceEnvironment } from '../toolbox/system/exec'
import { detectPython, getPythonVersion } from '../toolbox/system/python'
import type { Device } from '../types'
import { unwrapOr } from '../toolbox/system/errors'

function isDir(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory()
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile()
}

function which(tool: string): string | null {
  try {
    const result = execSync(`which ${tool}`, { encoding: 'utf8' }).trim()
    return result.length > 0 ? result : null
  } catch {
    return null
  }
}

function printTable(rows: string[][]): void {
  const labelWidth = Math.max(...rows.map((r) => r[0]?.length ?? 0)) + 2
  for (const [label, value] of rows) {
    console.log(`  ${(label ?? '').padEnd(labelWidth)}${value ?? ''}`)
  }
}

const command = buildCommand({
  async func(this: LocalContext) {
    const { currentVersion } = this
    await sourceEnvironment()

    const supportedDevices = []

    if (moddableExists()) {
      supportedDevices.push(DEVICE_ALIAS[os.type().toLowerCase() as Device])
    }

    if (typeof process.env.IDF_PATH === 'string' && isDir(process.env.IDF_PATH)) {
      supportedDevices.push('esp32')
    }
    if (
      typeof process.env.ESP_BASE === 'string' &&
      isDir(process.env.ESP_BASE) &&
      isDir(join(process.env.ESP_BASE, 'toolchain')) &&
      isDir(join(process.env.ESP_BASE, 'ESP8266_RTOS_SDK')) &&
      isDir(join(process.env.ESP_BASE, 'esp8266-2.3.0'))
    ) {
      supportedDevices.push('esp8266')
    }
    if (
      (process.env.PATH ?? '').includes('binaryen') &&
      isDir(process.env.EMSDK ?? '') &&
      isFile(process.env.EMSDK_NODE ?? '') &&
      isFile(process.env.EMSDK_PYTHON ?? '')
    ) {
      supportedDevices.push('wasm')
    }
    if (
      typeof process.env.PICO_SDK_PATH === 'string' &&
      isDir(process.env.PICO_SDK_PATH) &&
      which('picotool') !== null &&
      isFile(process.env.PIOASM ?? '')
    ) {
      supportedDevices.push('pico')
    }
    if (
      typeof process.env.NRF_ROOT === 'string' &&
      isDir(process.env.NRF_ROOT) &&
      ((typeof process.env.NRF_SDK_DIR === 'string' && isDir(process.env.NRF_SDK_DIR)) ||
        (typeof process.env.NRF52_SDK_PATH === 'string' && isDir(process.env.NRF52_SDK_PATH)))
    ) {
      supportedDevices.push('nrf52')
    }
    if (typeof process.env.ZEPHYR_BASE === 'string' && isDir(process.env.ZEPHYR_BASE)) {
      supportedDevices.push('zephyr')
    }

    const pythonVersion = unwrapOr(await getPythonVersion(), 'Unavailable')
    const pythonPath = which(detectPython() ?? '') ?? 'n/a'

    const moddableVersion = unwrapOr(await getModdableVersion(), 'Not found')
    const moddablePath = process.env.MODDABLE ?? 'n/a'

    console.log('xs-dev environment info:')
    printTable(
      [
        ['CLI Version', currentVersion],
        ['OS', os.type()],
        ['Arch', os.arch()],
        ['Shell', process.env.SHELL ?? 'Unknown'],
        ['NodeJS Version', `${process.version} (${which('node') ?? 'path not found'})`],
        ['Python Version', `${pythonVersion} (${pythonPath})`],
        ['Moddable SDK Version', `${moddableVersion} (${moddablePath})`],
        [
          'Supported target devices',
          supportedDevices.length > 0 ? supportedDevices.join(', ') : 'None',
        ],
        ...(supportedDevices.includes('esp32')
          ? [['ESP32 IDF Directory', String(process.env.IDF_PATH)]]
          : []),
        ...(supportedDevices.includes('esp8266')
          ? [['ESP8266 Base Directory', String(process.env.ESP_BASE)]]
          : []),
        ...(supportedDevices.includes('wasm')
          ? [['Wasm EMSDK Directory', String(process.env.EMSDK)]]
          : []),
        ...(supportedDevices.includes('pico')
          ? [['Pico SDK Directory', String(process.env.PICO_SDK_PATH)]]
          : []),
        ...(supportedDevices.includes('nrf52')
          ? [['NRF52 SDK Directory', String(process.env.NRF_SDK_DIR ?? process.env.NRF52_SDK_PATH)]]
          : []),
        ...(supportedDevices.includes('zephyr')
          ? [['Zephyr SDK Directory', String(process.env.ZEPHYR_BASE)]]
          : []),
      ],
    )

    console.log(
      `\nIf this is related to an error when using the CLI, please create an issue at "https://github.com/hipsterbrown/xs-dev/issues/new" with the above info.`,
    )
  },
  docs: {
    brief:
      'Display the current environment setup information, including valid target devices.',
  },
  parameters: {
    flags: {},
  },
})

export default command
