import os from 'node:os'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { DEVICE_ALIAS } from '../prompt/devices.js'
import { getModdableVersion, moddableExists } from '../setup/moddable.js'
import { sourceEnvironment, which } from '../system/exec.js'
import { detectPython, getPythonVersion } from '../system/python.js'
import type { Device } from '../../types.js'
import { unwrapOr } from '../system/errors.js'

function isDir(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory()
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile()
}

export interface EnvironmentInfo {
  cliVersion: string
  osType: string
  arch: string
  shell: string
  nodeVersion: string
  nodePath: string
  pythonVersion: string
  pythonPath: string
  moddableVersion: string
  moddablePath: string
  supportedDevices: string[]
}

export async function gatherEnvironmentInfo(cliVersion: string): Promise<EnvironmentInfo> {
  await sourceEnvironment()

  const supportedDevices: string[] = []

  if (moddableExists()) {
    supportedDevices.push(DEVICE_ALIAS[os.type().toLowerCase() as Device] as string)
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

  return {
    cliVersion,
    osType: os.type(),
    arch: os.arch(),
    shell: process.env.SHELL ?? 'Unknown',
    nodeVersion: process.version,
    nodePath: which('node') ?? 'path not found',
    pythonVersion,
    pythonPath,
    moddableVersion,
    moddablePath,
    supportedDevices,
  }
}
