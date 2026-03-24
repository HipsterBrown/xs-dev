export interface DeviceInfo {
  device: string
  features: string
}

const KNOWN_DEVICES: Record<number, Record<number, string>> = {
  0x2e8a: {
    0x0003: 'Raspberry Pi Pico',
    0x0004: 'Raspberry Pi Pico',
    0x0005: 'Raspberry Pi Pico',
    0x0009: 'Raspberry Pi Pico W',
    0x000a: 'Raspberry Pi Pico 2',
    0x000b: 'Raspberry Pi Pico 2',
    0x000c: 'Raspberry Pi Pico 2 W',
  },
  0x303a: {
    0x0002: 'ESP32-S2',
    0x1001: 'ESP32-S3',
    0x8086: 'ESP32-C3',
  },
}

const VENDOR_FALLBACKS: Record<number, string> = {
  0x2e8a: 'Raspberry Pi RP Device',
  0x303a: 'Espressif ESP Device',
}

const BRIDGE_VENDORS: Record<number, string> = {
  0x10c4: 'CP210x',
  0x1a86: 'CH340',
  0x0403: 'FTDI',
  0x067b: 'PL2303',
}

export function identifyDevice(vendorId: string | undefined, productId: string | undefined): DeviceInfo | null {
  if (vendorId === undefined) return null
  const vid = parseInt(vendorId, 16)
  const pid = productId !== undefined ? parseInt(productId, 16) : 0
  if (isNaN(vid)) return null

  const exactMatch = KNOWN_DEVICES[vid]?.[pid]
  if (exactMatch !== undefined) {
    // features require chip-level probing (e.g. picoboot protocol) — not available via VID/PID alone
    return { device: exactMatch, features: '' }
  }

  const vendorFallback = VENDOR_FALLBACKS[vid]
  if (vendorFallback !== undefined) {
    // features require chip-level probing (e.g. picoboot protocol) — not available via VID/PID alone
    return { device: vendorFallback, features: '' }
  }

  const bridge = BRIDGE_VENDORS[vid]
  if (bridge !== undefined) {
    // features require chip-level probing (e.g. picoboot protocol) — not available via VID/PID alone
    return { device: `ESP Device (${bridge})`, features: '' }
  }

  return null
}
