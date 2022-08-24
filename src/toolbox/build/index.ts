import handler from 'serve-handler'
import { createServer } from 'http'
import { filesystem, print, prompt, system } from 'gluegun'
import { collectChoicesFromTree } from '../prompt/choices'

export interface BuildArgs {
  port?: string
  example?: string
  listExamples: boolean
  listDevices: boolean
  projectPath: string
  targetPlatform: string
  mode: 'development' | 'production'
  deploy: boolean
  outputDir: string
}

export async function build({
  listDevices,
  port,
  example,
  listExamples,
  projectPath,
  targetPlatform,
  mode,
  deploy,
  outputDir,
}: BuildArgs): Promise<void> {
  if (listDevices) {
    const choices = [
      'esp',
      'esp/moddable_zero',
      'esp/moddable_one',
      'esp/moddable_three',
      'esp/nodemcu',
      'esp32',
      'esp32/moddable_two',
      'esp32/nodemcu',
      'esp32/m5stack',
      'esp32/m5stack_core2',
      'esp32/m5stick_fire',
      'esp32/m5atom_echo',
      'esp32/m5atom_lite',
      'esp32/m5atom_matrix',
      'esp32/m5paper',
      'esp32/m5core_ink',
      'esp32/heltec_wifi_kit_32',
      'esp32/esp32_thing',
      'esp32/esp32_thing_plus',
      'esp32/wrover_kit',
      'esp32/kaluga',
      'esp32/saola_wroom',
      'esp32/saola_wrover',
      'wasm',
      'pico',
      'pico/ili9341',
      'pico/pico_display',
      'pico/pico_display_2',
      'simulator/moddable_one',
      'simulator/moddable_two',
      'simulator/moddable_three',
      'simulator/m5stickc',
      'simulator/m5paper',
      'simulator/nodemcu',
      'simulator/pico_display',
      'simulator/pico_display_2',
    ]
    const { device: selectedDevice } = await prompt.ask([
      {
        type: 'autocomplete',
        name: 'device',
        message: 'Here are the available target devices:',
        choices,
      },
    ])

    if (selectedDevice !== '' && selectedDevice !== undefined) {
      targetPlatform = selectedDevice
    } else {
      print.warning('Please select a target device to run')
      process.exit(0)
    }
  }

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

    if (selectedExample !== '' && selectedExample !== undefined) {
      print.info(`Running the example: xs-dev run --example ${selectedExample}`)
      projectPath = filesystem.resolve(exampleProjectPath, selectedExample)
    } else {
      print.warning('Please select an example to run.')
      process.exit(0)
    }
  }

  if (example !== undefined) {
    const exampleProjectPath = filesystem.resolve(
      String(process.env.MODDABLE),
      'examples',
      example
    )
    if (filesystem.exists(exampleProjectPath) === false) {
      print.error('Example project does not exist.')
      print.info(`Lookup the available examples: xs-dev run --list-examples`)
      process.exit(1)
    }
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

  const configArgs = [
    '-m',
    `-p ${targetPlatform}`,
    `-t ${deploy ? 'all' : 'build'}`,
    `-o ${outputDir}`,
  ]
  if (mode === 'development') configArgs.push('-d')
  if (mode === 'production') configArgs.push('-i')

  await system.exec(`mcconfig ${configArgs.join(' ')}`, {
    cwd: projectPath,
    process,
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
  } else {
    process.exit(0)
  }
}
