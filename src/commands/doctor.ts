import { buildCommand } from '@stricli/core'
import type { LocalContext } from '../app.js'
import { gatherEnvironmentInfo } from '../toolbox/doctor/index.js'
import { toolchains } from '../toolbox/toolchains/registry.js'
import { getHostContext } from '../toolbox/toolchains/context.js'
import * as output from '../lib/output.js'

function printTable(rows: string[][], write: (s: string) => void): void {
  const labelWidth = Math.max(...rows.map((r) => r[0]?.length ?? 0)) + 2
  for (const [label, value] of rows) {
    write(`  ${(label ?? '').padEnd(labelWidth)}${value ?? ''}`)
  }
}

const command = buildCommand({
  async func(this: LocalContext) {
    const { currentVersion } = this
    const ctx = getHostContext()
    const info = await gatherEnvironmentInfo(currentVersion, { toolchains: Object.values(toolchains), ctx })

    output.info('xs-dev environment info:\n')
    printTable(
      [
        ['CLI Version', info.cliVersion],
        ['OS', info.osType],
        ['Arch', info.arch],
        ['Shell', info.shell],
        ['NodeJS Version', `${info.nodeVersion} (${info.nodePath})`],
        ['Python Version', `${info.pythonVersion} (${info.pythonPath})`],
        ['Moddable SDK Version', `${info.moddableVersion} (${info.moddablePath})`],
        [
          'Supported target devices',
          info.supportedDevices.length > 0 ? info.supportedDevices.join(', ') : 'None',
        ],
        ...(info.supportedDevices.includes('esp32')
          ? [['ESP32 IDF Directory', String(process.env.IDF_PATH)]]
          : []),
        ...(info.supportedDevices.includes('esp8266')
          ? [['ESP8266 Base Directory', String(process.env.ESP_BASE)]]
          : []),
        ...(info.supportedDevices.includes('wasm')
          ? [['Wasm EMSDK Directory', String(process.env.EMSDK)]]
          : []),
        ...(info.supportedDevices.includes('pico')
          ? [['Pico SDK Directory', String(process.env.PICO_SDK_PATH)]]
          : []),
        ...(info.supportedDevices.includes('nrf52')
          ? [['NRF52 SDK Directory', String(process.env.NRF_SDK_DIR ?? process.env.NRF52_SDK_PATH)]]
          : []),
        ...(info.supportedDevices.includes('zephyr')
          ? [['Zephyr SDK Directory', String(process.env.ZEPHYR_BASE)]]
          : []),
      ],
      output.log,
    )

    output.info(
      `\nIf this is related to an error when using the CLI, please create an issue at "https://github.com/hipsterbrown/xs-dev/issues/new" with the above info.\n`,
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
