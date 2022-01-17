import type { GluegunCommand } from 'gluegun'
import { type as platformType } from 'os'
import handler from 'serve-handler'
import { createServer } from 'http'
import type { Device, XSDevToolbox } from '../types'
import { collectChoicesFromTree } from '../toolbox/prompt/choices'

interface RunOptions {
  device?: Device
  port?: string
  example?: string
  listExamples?: boolean
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
  run: async ({ parameters, print, system, filesystem, prompt }) => {
    const currentPlatform: Device = platformType().toLowerCase() as Device
    const {
      device = currentPlatform,
      port,
      example,
      listExamples = false,
    }: RunOptions = parameters.options
    const targetPlatform: string = DEVICE_ALIAS[device] ?? device
    let projectPath = filesystem.resolve(parameters.first ?? '.')

    if (listExamples) {
      const exampleProjectPath = filesystem.resolve(
        String(process.env.MODDABLE),
        'examples'
      )
      const examples = filesystem.inspectTree(exampleProjectPath)?.children
      const choices =
        examples !== undefined
          ? examples.map((example) => collectChoicesFromTree(example)).flat()
          : []
      const { example: selectedExample } = await prompt.ask([
        {
          type: 'autocomplete',
          name: 'example',
          message: 'Here are the available examples:',
          choices,
        },
      ])
      print.info(`Run the example: xs-dev run --example ${selectedExample}`)
      process.exit(0)
    }

    if (example !== undefined) {
      const exampleProjectPath = filesystem.resolve(
        String(process.env.MODDABLE),
        'examples',
        example
      )
      if (
        filesystem.exists(
          filesystem.resolve(exampleProjectPath, 'manifest.json')
        ) === false
      ) {
        print.error('Example project must contain a manifest.json.')
        print.info(`Lookup the available examples: xs-dev run --list-examples`)
        process.exit(1)
      }
      projectPath = exampleProjectPath
    }

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
      const buildName = String(projectPath.split('/').pop())
      const debugPath = filesystem.resolve(
        String(process.env.MODDABLE),
        'build',
        'bin',
        'wasm',
        'debug',
        buildName
      )
      createServer((req, res) => {
        void handler(req, res, { public: debugPath })
      }).listen(8080, () => {
        print.info(
          'Started server on port 8080, go to http://localhost:8080 in your browser to view the simulator'
        )
      })
    }
  },
}

export default command
