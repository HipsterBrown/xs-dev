import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

describe('toolbox/scan', async () => {
  mock.module('serialport', {
    namedExports: {
      SerialPort: {
        list: mock.fn(async () => []),
      },
    },
  })

  const { default: scanDevices } = await import('#src/toolbox/scan/index.js')
  const { SerialPort } = await import('serialport')

  it('yields a step:start event', async () => {
    const events = await Array.fromAsync(scanDevices())
    assert.ok(events.some((e) => e.type === 'step:start'))
  })

  it('yields warning when no ports are found', async () => {
    const events = await Array.fromAsync(scanDevices())
    const warnings = events.filter((e) => e.type === 'warning')
    assert.ok(warnings.some((e) => e.message.includes('No available devices')))
  })

  it('excludes ports with undefined vendorId', async () => {
    ;(SerialPort.list as ReturnType<typeof mock.fn>).mock.mockImplementation(
      async () => [{ path: '/dev/tty.usbserial', vendorId: undefined, productId: undefined }],
    )
    const events = await Array.fromAsync(scanDevices())
    const warnings = events.filter((e) => e.type === 'warning')
    assert.ok(warnings.some((e) => e.message.includes('No available devices')))
  })

  it('excludes ports with unrecognized VID', async () => {
    ;(SerialPort.list as ReturnType<typeof mock.fn>).mock.mockImplementation(
      async () => [{ path: '/dev/tty.usbserial', vendorId: 'dead', productId: 'beef' }],
    )
    const events = await Array.fromAsync(scanDevices())
    const warnings = events.filter((e) => e.type === 'warning')
    assert.ok(warnings.some((e) => e.message.includes('No available devices')))
  })

  it('yields info rows for a recognized Pico device', async () => {
    ;(SerialPort.list as ReturnType<typeof mock.fn>).mock.mockImplementation(
      async () => [{ path: '/dev/cu.usbmodem1234', vendorId: '2e8a', productId: '0003' }],
    )
    const events = await Array.fromAsync(scanDevices())
    const infos = events.filter((e) => e.type === 'info')
    assert.ok(infos.some((e) => e.message.includes('Raspberry Pi Pico')))
  })

  it('yields info rows for a bridge-based ESP device', async () => {
    ;(SerialPort.list as ReturnType<typeof mock.fn>).mock.mockImplementation(
      async () => [{ path: '/dev/cu.usbserial-0001', vendorId: '10c4', productId: 'ea60' }],
    )
    const events = await Array.fromAsync(scanDevices())
    const infos = events.filter((e) => e.type === 'info')
    assert.ok(infos.some((e) => e.message.includes('ESP Device (CP210x)')))
  })

  it('normalizes tty paths to cu on macOS', async () => {
    ;(SerialPort.list as ReturnType<typeof mock.fn>).mock.mockImplementation(
      async () => [{ path: '/dev/tty.usbmodem1234', vendorId: '2e8a', productId: '0003' }],
    )
    const events = await Array.fromAsync(scanDevices())
    const infos = events.filter((e) => e.type === 'info')
    assert.ok(infos.some((e) => e.message.includes('/dev/cu.usbmodem1234')))
    assert.ok(infos.every((e) => !e.message.includes('/dev/tty.')))
  })

  it('does not normalize non-macOS paths', async () => {
    ;(SerialPort.list as ReturnType<typeof mock.fn>).mock.mockImplementation(
      async () => [{ path: '/dev/ttyUSB0', vendorId: '10c4', productId: 'ea60' }],
    )
    const events = await Array.fromAsync(scanDevices())
    const infos = events.filter((e) => e.type === 'info')
    assert.ok(infos.some((e) => e.message.includes('/dev/ttyUSB0')))
  })
})
