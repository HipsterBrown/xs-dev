type ScanResult = Record<string, { device: string; features: string }>
type ParseState = 'searching' | 'portFound' | 'deviceFound' | 'featuresFound'

function parseEsptoolLines(lines: string[]): ScanResult {
  let state: ParseState = 'searching'
  let currentPort: string | null = null

  return lines.reduce<ScanResult>((result, line) => {
    if (state === 'searching') {
      if (line.startsWith('Serial port')) {
        currentPort = line.replace('Serial port ', '').replace('tty', 'cu')
        result[currentPort] = { device: '', features: '' }
        state = 'portFound'
      }
    }

    if (state === 'portFound') {
      if (line.startsWith('Chip is ') && currentPort !== null) {
        const device = line.replace('Chip is ', '')
        result[currentPort].device = device
        state = 'deviceFound'
      }
      if (line.includes('failed to connect') && currentPort !== null) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete result[currentPort]
        currentPort = null
        state = 'searching'
      }
    }

    if (state === 'deviceFound') {
      if (line.startsWith('Features: ') && currentPort !== null) {
        const features = line.replace('Features: ', '')
        result[currentPort].features = features
        state = 'featuresFound'
      }
    }

    if (state === 'featuresFound') {
      if (line.startsWith('Hard resetting')) {
        currentPort = null
        state = 'searching'
      }
    }

    return result
  }, {})
}

function parsePicotoolLines(lines: string[], port: string): ScanResult {
  let state: ParseState = 'searching'
  const currentPort = port.replace('tty', 'cu')

  return lines.reduce<ScanResult>((result, line) => {
    if (state === 'searching') {
      result[currentPort] = { device: '', features: '' }
      state = 'portFound'
    }

    if (state === 'portFound') {
      if (line.trim().startsWith('features')) {
        const [, features] = line.split(':')
        result[currentPort].features = features.trim()
        state = 'featuresFound'
      }
    }

    if (state === 'featuresFound') {
      if (line.trim().startsWith('pico_board')) {
        const [, device] = line.split(':')
        result[currentPort].device = device.trim()
        state = 'deviceFound'
      }
    }

    if (state === 'deviceFound') {
      if (line.includes('asked to reboot')) {
        state = 'searching'
      }
    }
    return result
  }, {})
}

export function parseScanResult(
  scans: Array<
    [output: Buffer, port: string] | [output: undefined, port: string]
  >
): ScanResult {
  return scans.reduce<ScanResult>((result, [output, port]) => {
    if (typeof output === 'undefined') return result
    const lines = String(output).split('\n')

    if (output.includes('pico_board')) {
      return { ...result, ...parsePicotoolLines(lines, port) }
    }
    return { ...result, ...parseEsptoolLines(lines) }
  }, {})
}
