import { setTimeout as sleep } from 'node:timers/promises'
import { existsSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { buildCommand } from '@stricli/core'
import { SerialPort } from 'serialport'
import { findBySerialNumber } from 'usb'
import ora from 'ora'
import type { LocalContext } from '../app.js'
import { parseScanResult } from '../toolbox/scan/parse.js'
import { sourceEnvironment, sourceIdf } from '../toolbox/system/exec.js'
import * as output from '../lib/output.js'

const command = buildCommand({
  docs: {
    brief: 'Look for available devices for deployment',
  },
  async func(this: LocalContext) {
    const spinner = ora()

    await sourceEnvironment()

    if (
      typeof process.env.IDF_PATH === 'string' &&
      existsSync(process.env.IDF_PATH) && statSync(process.env.IDF_PATH).isDirectory()
    ) {
      spinner.start(`Found ESP_IDF, sourcing environment...`)
      await sourceIdf()
      spinner.stop()
    }

    const esptoolPath = (() => {
      try {
        const result = execSync('which esptool.py', { encoding: 'utf8' }).trim()
        return result.length > 0 ? result : null
      } catch {
        return null
      }
    })()

    if (esptoolPath === null) {
      output.warn(
        'esptool.py required to scan for Espressif devices. Setup environment for ESP8266 or ESP32:\n xs-dev setup --device esp32\n xs-dev setup --device esp8266.',
      )
    }

    const picotoolPath = (() => {
      try {
        const result = execSync('which picotool', { encoding: 'utf8' }).trim()
        return result.length > 0 ? result : null
      } catch {
        return null
      }
    })()
    const hasPicotool = picotoolPath !== null

    if (hasPicotool) {
      try {
        spinner.start('Found picotool, rebooting device before scanning')
        execSync('picotool reboot -fa')
        await sleep(1000)
        spinner.stop()
      } catch { }
    }

    spinner.start('Scanning for devices...')

    const ports = await SerialPort.list()
    const result: Array<
      [output: Buffer, port: string] | [output: undefined, port: string]
    > = await Promise.all(
      ports
        .filter((port) => port.serialNumber !== undefined)
        .map(async (port) => {
          try {
            if (port.vendorId === '2e8a' && hasPicotool) {
              const device = await findBySerialNumber(port.serialNumber ?? '')
              const bus = String(device?.busNumber)
              const address = String(device?.deviceAddress)
              const buffer = execSync(`picotool info --bus ${bus} --address ${address} -fa`)
              return [buffer, port.path] as [Buffer, string]
            }
            const buffer = execSync(`esptool.py --port ${port.path} read_mac`)
            return [buffer, port.path] as [Buffer, string]
          } catch { }
          return [undefined, port.path]
        }),
    )

    const record = parseScanResult(result)
    const rows = Object.keys(record).map((port) => {
      const { device, features } = record[port]
      return [port, device, features]
    })

    if (rows.length === 0) {
      spinner.warn('No available devices found.')
    } else {
      spinner.succeed('Found the following available devices!')
      const allRows = [['Port', 'Device', 'Features'], ...rows]
      const colWidths = allRows[0].map((_, colIdx) =>
        Math.max(...allRows.map((row) => String(row[colIdx]).length)),
      )
      for (const row of allRows) {
        output.info(
          row.map((cell, idx) => String(cell).padEnd(colWidths[idx])).join('  '),
        )
      }
    }
  },
  parameters: {
    flags: {},
  },
})

export default command
