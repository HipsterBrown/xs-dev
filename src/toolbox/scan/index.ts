import { setTimeout as sleep } from 'node:timers/promises'
import { execSync } from 'node:child_process'
import { SerialPort } from 'serialport'
import { findBySerialNumber } from 'usb'
import type { OperationEvent } from '../../lib/events.js'
import { parseScanResult } from './parse.js'
import { adapters } from '../adapters/registry.js'
import { getAdapterContext } from '../adapters/context.js'

export default async function* scanDevices(): AsyncGenerator<OperationEvent> {
  const ctx = getAdapterContext()
  for (const adapter of Object.values(adapters)) {
    Object.assign(process.env, adapter.getEnvVars(ctx))
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
    yield {
      type: 'warning',
      message:
        'esptool.py required to scan for Espressif devices. Setup environment for ESP8266 or ESP32:\n xs-dev setup --device esp32\n xs-dev setup --device esp8266.',
    }
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
      yield { type: 'step:start', message: 'Found picotool, rebooting device before scanning' }
      execSync('picotool reboot -fa')
      await sleep(1000)
      yield { type: 'step:done' }
    } catch {
      yield { type: 'step:done' } // best-effort reboot, continue scanning
    }
  }

  yield { type: 'step:start', message: 'Scanning for devices...' }

  const ports = await SerialPort.list()
  const result: Array<[output: Buffer, port: string] | [output: undefined, port: string]> =
    await Promise.all(
      ports
        .filter((port) => port.serialNumber !== undefined)
        .map(async (port) => {
          try {
            if (port.vendorId === '2e8a' && hasPicotool) {
              const device = await findBySerialNumber(port.serialNumber ?? '')
              if (device === null || typeof device === 'undefined') {
                return [undefined, port.path] as [undefined, string]
              }
              const bus = String(device.busNumber)
              const address = String(device.deviceAddress)
              const buffer = execSync(`picotool info --bus ${bus} --address ${address} -fa`)
              return [buffer, port.path] as [Buffer, string]
            }
            if (esptoolPath === null) {
              return [undefined, port.path] as [undefined, string]
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
    yield { type: 'warning', message: 'No available devices found.' }
  } else {
    yield { type: 'step:done', message: 'Found the following available devices!' }
    const allRows = [['Port', 'Device', 'Features'], ...rows]
    const colWidths = allRows[0].map((_, colIdx) =>
      Math.max(...allRows.map((row) => String(row[colIdx]).length)),
    )
    for (const row of allRows) {
      yield {
        type: 'info',
        message: row.map((cell, idx) => String(cell).padEnd(colWidths[idx])).join('  '),
      }
    }
  }
}
