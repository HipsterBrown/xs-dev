import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

describe('toolbox/scan', async () => {
  mock.module('node:fs', {
    namedExports: {
      existsSync: mock.fn(() => false),
      statSync: mock.fn(() => ({ isDirectory: () => false })),
    },
  })

  mock.module('node:child_process', {
    namedExports: {
      execSync: mock.fn(() => {
        throw new Error('command not found')
      }),
    },
  })

  mock.module('#src/toolbox/system/exec.js', {
    namedExports: {
      sourceEnvironment: mock.fn(async () => ({ success: true, data: undefined })),
      sourceIdf: mock.fn(async () => ({ success: true, data: undefined })),
    },
  })

  mock.module('serialport', {
    namedExports: {
      SerialPort: {
        list: mock.fn(async () => []),
      },
    },
  })

  mock.module('usb', {
    namedExports: {
      findBySerialNumber: mock.fn(async () => null),
    },
  })

  mock.module('#src/toolbox/scan/parse.js', {
    namedExports: {
      parseScanResult: mock.fn(() => ({})),
    },
  })

  const { default: scanDevices } = await import('#src/toolbox/scan/index.js')

  it('yields esptool warning when esptool.py is not found', async () => {
    const events = await Array.fromAsync(scanDevices())
    const warnings = events.filter((e) => e.type === 'warning')
    assert.ok(
      warnings.some((e) => e.message.includes('esptool.py required')),
      `Should warn about missing esptool.py, got warnings: ${warnings.map((w) => w.message).join(', ')}`,
    )
  })

  it('yields warning when no devices found', async () => {
    const events = await Array.fromAsync(scanDevices())
    const warnings = events.filter((e) => e.type === 'warning')
    assert.ok(
      warnings.some((e) => e.message.includes('No available devices')),
      'Should warn when no devices found',
    )
  })
})
