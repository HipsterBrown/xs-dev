import type { XSDevToolbox } from '../types'

export default (toolbox: XSDevToolbox): void => {
  toolbox.setup = {
    darwin: async () => toolbox.print.info('Setting up the mac tools!'),
    linux: async () => toolbox.print.info('Setting up the linux tools'),
    windows_nt: async () => toolbox.print.info('Setting up the windows tools'),
    esp: async () => toolbox.print.info('Setting up esp8266 tools'),
    esp8266: async () => toolbox.info('Setting up esp8266 tools'),
    esp32: async () => toolbox.info('Setting up esp32 tools'),
    wasm: async () => toolbox.info('Setting up wasm tools'),
  }
}
