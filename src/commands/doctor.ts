import os from 'node:os'
import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../app'
import { DEVICE_ALIAS } from '../toolbox/prompt/devices'
import { getModdableVersion, moddableExists } from '../toolbox/setup/moddable'
import { sourceEnvironment } from '../toolbox/system/exec'
import { detectPython, getPythonVersion } from '../toolbox/system/python'
import type { Device } from '../types'
import { unwrapOr } from '../toolbox/system/errors'

const command = buildCommand({
  async func(this: LocalContext) {
    const { print, filesystem, system, currentVersion } = this
    await sourceEnvironment()

    const supportedDevices = []

    if (moddableExists()) {
      supportedDevices.push(DEVICE_ALIAS[os.type().toLowerCase() as Device])
    }

    if (
      typeof process.env.IDF_PATH === 'string' &&
      filesystem.exists(process.env.IDF_PATH) === 'dir'
    ) {
      supportedDevices.push('esp32')
    }
    if (
      typeof process.env.ESP_BASE === 'string' &&
      filesystem.exists(process.env.ESP_BASE) === 'dir' &&
      filesystem.exists(
        filesystem.resolve(process.env.ESP_BASE, 'toolchain'),
      ) === 'dir' &&
      filesystem.exists(
        filesystem.resolve(process.env.ESP_BASE, 'ESP8266_RTOS_SDK'),
      ) === 'dir' &&
      filesystem.exists(
        filesystem.resolve(process.env.ESP_BASE, 'esp8266-2.3.0'),
      ) === 'dir'
    ) {
      supportedDevices.push('esp8266')
    }
    if (
      (process.env.PATH ?? '').includes('binaryen') &&
      filesystem.exists(process.env.EMSDK ?? '') === 'dir' &&
      filesystem.exists(process.env.EMSDK_NODE ?? '') === 'file' &&
      filesystem.exists(process.env.EMSDK_PYTHON ?? '') === 'file'
    ) {
      supportedDevices.push('wasm')
    }
    if (
      typeof process.env.PICO_SDK_PATH === 'string' &&
      filesystem.exists(process.env.PICO_SDK_PATH) === 'dir' &&
      system.which('picotool') !== null &&
      filesystem.exists(process.env.PIOASM ?? '') === 'file'
    ) {
      supportedDevices.push('pico')
    }
    if (
      typeof process.env.NRF_ROOT === 'string' &&
      filesystem.exists(process.env.NRF_ROOT) === 'dir' &&
      ((typeof process.env.NRF_SDK_DIR === 'string' &&
        filesystem.exists(process.env.NRF_SDK_DIR) === 'dir') ||
        (typeof process.env.NRF52_SDK_PATH === 'string' &&
          filesystem.exists(process.env.NRF52_SDK_PATH) === 'dir'))
    ) {
      supportedDevices.push('nrf52')
    }

    const pythonVersion = unwrapOr(await getPythonVersion(), 'Unavailable')
    const pythonPath = system.which(detectPython() ?? '') ?? 'n/a'

    const moddableVersion = unwrapOr(await getModdableVersion(), 'Not found')
    const moddablePath = process.env.MODDABLE ?? 'n/a'

    print.info('xs-dev environment info:')
    print.table(
      [
        ['CLI Version', currentVersion],
        ['OS', os.type()],
        ['Arch', os.arch()],
        ['Shell', process.env.SHELL ?? 'Unknown'],
        [
          'NodeJS Version',
          `${process.version} (${system.which('node') ?? 'path not found'})`,
        ],
        ['Python Version', `${pythonVersion} (${pythonPath})`],
        ['Moddable SDK Version', `${moddableVersion} (${moddablePath})`],
        [
          'Supported target devices',
          supportedDevices.length > 0 ? supportedDevices.join(', ') : 'None',
        ],
        supportedDevices.includes('esp32')
          ? ['ESP32 IDF Directory', String(process.env.IDF_PATH)]
          : [],
        supportedDevices.includes('esp8266')
          ? ['ESP8266 Base Directory', String(process.env.ESP_BASE)]
          : [],
        supportedDevices.includes('wasm')
          ? ['Wasm EMSDK Directory', String(process.env.ESMDK)]
          : [],
        supportedDevices.includes('pico')
          ? ['Pico SDK Directory', String(process.env.PICO_SDK_PATH)]
          : [],
        supportedDevices.includes('nrf52')
          ? [
            'NRF52 SDK Directory',
            String(process.env.NRF_SDK_DIR ?? process.env.NRF52_SDK_PATH),
          ]
          : [],
      ].filter((tuple) => tuple.length !== 0),
    )

    print.highlight(
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
