import type { GluegunCommand } from 'gluegun'
import { type as platformType } from 'os'
import type { Device, XSDevToolbox } from '../types'

interface RunOptions {
  device?: Device
  port?: string
}

const DEVICE_ALIAS: Record<Device | 'esp8266', string> = Object.freeze({
  esp8266: 'esp',
  darwin: 'mac',
  windows_nt: 'win',
  linux: 'lin',
  esp: 'esp',
  esp32: 'esp32',
  wasm: 'wasm',
})

const command: GluegunCommand<XSDevToolbox> = {
  name: 'run',
  description: 'Build and launch project on target device or simulator',
  run: async ({ parameters, print, system, filesystem }) => {
    const projectPath = filesystem.resolve(parameters.first ?? '.')
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const { device = currentPlatform, port }: RunOptions = parameters.options
    const targetPlatform: string = DEVICE_ALIAS[device] ?? device

    if (port !== undefined) {
      process.env.UPLOAD_PORT = port
    }

    const spinner = print.spin()

    spinner.start(
      `Building and running project ${projectPath} on ${targetPlatform}`
    )

    await system.exec(`mcconfig -d -m -p ${targetPlatform}`, {
      cwd: projectPath,
      stdout: process.stdout,
    })

    spinner.stop()

    if (targetPlatform === 'wasm') {
      print.info(
        'Starting python server on port 8000, go to http://localhost:8000 in your browser to view simulator'
      )
      const buildName = String(projectPath.split('/').pop())
      const debugPath = filesystem.resolve(
        String(process.env.MODDABLE),
        'build',
        'bin',
        'wasm',
        'debug',
        buildName
      )
      await system.spawn('python3 -m http.server', { cwd: debugPath })
    }
  },
}

export default command
