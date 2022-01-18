import type { XSDevToolbox } from '../types'
import updateMac from '../toolbox/update/mac'
import updateLinux from '../toolbox/update/linux'
import updateWindows from '../toolbox/update/windows'
import updateESP8266 from '../toolbox/update/esp8266'
import updateESP32 from '../toolbox/update/esp32'
import updateWasm from '../toolbox/update/wasm'
import updatePico from '../toolbox/update/pico'

export default async (toolbox: XSDevToolbox): Promise<void> => {
  toolbox.update = {
    darwin: updateMac,
    linux: updateLinux,
    windows_nt: updateWindows,
    esp: updateESP8266,
    esp8266: updateESP8266,
    esp32: updateESP32,
    wasm: updateWasm,
    pico: updatePico,
  }
}
