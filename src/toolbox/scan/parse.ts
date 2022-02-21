type ScanResult = Record<string, { device: string; features: string }>
type ParseState = 'searching' | 'portFound' | 'deviceFound' | 'featuresFound'

export function parseScanResult(output: string): ScanResult {
  const lines = output.split('\n')
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
