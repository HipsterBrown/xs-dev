import { debuglog } from 'node:util'
import { SerialPort } from 'serialport'
import type { OperationEvent } from '../../lib/events.js'
import { identifyDevice } from './devices.js'

const debug = debuglog('xs-dev:scan')

function normalizePath(portPath: string): string {
  return portPath.replace('/dev/tty.', '/dev/cu.')
}

export default async function* scanDevices(): AsyncGenerator<OperationEvent> {
  yield { type: 'step:start', message: 'Scanning for devices...' }

  const ports = await SerialPort.list()

  const rows = ports
    .filter((port) => port.vendorId !== undefined)
    .flatMap((port) => {
      debug(JSON.stringify(port, null, 2))
      const info = identifyDevice(port.vendorId, port.productId)
      if (info === null) return []
      return [[normalizePath(port.path), info.device, info.features]]
    })

  if (rows.length === 0) {
    yield { type: 'warning', message: 'No available devices found.' }
    return
  }

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
