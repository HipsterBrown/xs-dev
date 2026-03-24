import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { identifyDevice } from '#src/toolbox/scan/devices.js'

describe('toolbox/scan/devices', () => {
  describe('identifyDevice', () => {
    // Tier 1: exact VID/PID match — Raspberry Pi Pico family
    it('identifies Raspberry Pi Pico (RP2040, BOOTSEL) via VID/PID', () => {
      const result = identifyDevice(0x2e8a, 0x0003)
      assert.deepEqual(result, { device: 'Raspberry Pi Pico', features: '' })
    })

    it('identifies Raspberry Pi Pico (RP2040, CDC) via VID/PID', () => {
      const result = identifyDevice(0x2e8a, 0x0004)
      assert.deepEqual(result, { device: 'Raspberry Pi Pico', features: '' })
    })

    it('identifies Raspberry Pi Pico (MicroPython) via VID/PID', () => {
      const result = identifyDevice(0x2e8a, 0x0005)
      assert.deepEqual(result, { device: 'Raspberry Pi Pico', features: '' })
    })

    it('identifies Raspberry Pi Pico W via VID/PID', () => {
      const result = identifyDevice(0x2e8a, 0x0009)
      assert.deepEqual(result, { device: 'Raspberry Pi Pico W', features: '' })
    })

    it('identifies Raspberry Pi Pico 2 (BOOTSEL) via VID/PID', () => {
      const result = identifyDevice(0x2e8a, 0x000a)
      assert.deepEqual(result, { device: 'Raspberry Pi Pico 2', features: '' })
    })

    it('identifies Raspberry Pi Pico 2 (CDC) via VID/PID', () => {
      const result = identifyDevice(0x2e8a, 0x000b)
      assert.deepEqual(result, { device: 'Raspberry Pi Pico 2', features: '' })
    })

    it('identifies Raspberry Pi Pico 2 W via VID/PID', () => {
      const result = identifyDevice(0x2e8a, 0x000c)
      assert.deepEqual(result, { device: 'Raspberry Pi Pico 2 W', features: '' })
    })

    // Tier 1: exact VID/PID match — Espressif native USB
    it('identifies ESP32-S2 via VID/PID', () => {
      const result = identifyDevice(0x303a, 0x0002)
      assert.deepEqual(result, { device: 'ESP32-S2', features: '' })
    })

    it('identifies ESP32-S3 via VID/PID', () => {
      const result = identifyDevice(0x303a, 0x1001)
      assert.deepEqual(result, { device: 'ESP32-S3', features: '' })
    })

    it('identifies ESP32-C3 via VID/PID', () => {
      const result = identifyDevice(0x303a, 0x8086)
      assert.deepEqual(result, { device: 'ESP32-C3', features: '' })
    })

    // Tier 2: known vendor with unknown PID
    it('returns generic Raspberry Pi name for unknown Pico PID', () => {
      const result = identifyDevice(0x2e8a, 0xffff)
      assert.deepEqual(result, { device: 'Raspberry Pi RP Device', features: '' })
    })

    it('returns generic Espressif name for unknown native USB PID', () => {
      const result = identifyDevice(0x303a, 0xffff)
      assert.deepEqual(result, { device: 'Espressif ESP Device', features: '' })
    })

    // Tier 3: USB-UART bridge chips
    it('identifies Silicon Labs CP210x bridge', () => {
      const result = identifyDevice(0x10c4, 0xea60)
      assert.deepEqual(result, { device: 'ESP Device (CP210x)', features: '' })
    })

    it('identifies WCH CH340 bridge', () => {
      const result = identifyDevice(0x1a86, 0x7523)
      assert.deepEqual(result, { device: 'ESP Device (CH340)', features: '' })
    })

    it('identifies FTDI bridge', () => {
      const result = identifyDevice(0x0403, 0x6001)
      assert.deepEqual(result, { device: 'ESP Device (FTDI)', features: '' })
    })

    it('identifies Prolific PL2303 bridge', () => {
      const result = identifyDevice(0x067b, 0x2303)
      assert.deepEqual(result, { device: 'ESP Device (PL2303)', features: '' })
    })

    // Unknown — not an xs-dev target
    it('returns null for unrecognized VID', () => {
      const result = identifyDevice(0xdead, 0xbeef)
      assert.equal(result, null)
    })
  })
})
