import { type as platformType } from 'os'
import handler from 'serve-handler'
import { createServer } from 'http'
import { filesystem, print, prompt, system } from 'gluegun'
import { collectChoicesFromTree } from '../prompt/choices'
import { moddableExists } from '../setup/moddable'
import { DEVICE_ALIAS } from '../prompt/devices'
import { Device } from '../../types'

export type DeployStatus = 'none' | 'run' | 'push'

export interface BuildArgs {
  port?: string
  example?: string
  listExamples: boolean
  listDevices: boolean
  projectPath: string
  targetPlatform: string
  mode: 'development' | 'production'
  deployStatus: DeployStatus
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
  deployStatus,
  outputDir,
}: BuildArgs): Promise<void> {
  const OS = platformType().toLowerCase() as Device

  if (!moddableExists()) {
    print.error(
      `Moddable tooling required. Run 'xs-dev setup --device ${DEVICE_ALIAS[OS]}' before trying again.`
    )
    process.exit(1)
  }

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

  if (targetPlatform !== '') {
    if (targetPlatform.includes('esp32')) {
      if (typeof process.env.IDF_PATH !== 'string' || filesystem.exists(process.env.IDF_PATH) !== 'dir') {
        print.error('The current environment does not appear to be set up for the ESP32 build target. Please run `xs-dev setup --device esp32` before trying again.')
        process.exit(1)
      }
    } else if (targetPlatform.includes('esp')) {
      if (typeof process.env.ESP_BASE !== 'string' || filesystem.exists(process.env.ESP_BASE) !== 'dir') {
        print.error('The current environment does not appear to be set up for the ESP8266 build target. Please run `xs-dev setup --device esp8266` before trying again.')
        process.exit(1)
      }
    }

    if (targetPlatform.includes('wasm')) {
      if (!(process.env.PATH ?? '').includes('binaryen') || filesystem.exists(process.env.EMSDK ?? '') !== 'dir' || filesystem.exists(process.env.EMSDK_NODE ?? '') !== 'file' || filesystem.exists(process.env.EMSDK_PYTHON ?? '') !== 'file') {
        print.error('The current environment does not appear to be set up for the wasm build target. Please run `xs-dev setup --device wasm` before trying again.')
        process.exit(1)
      }
    }

    if (targetPlatform.includes('pico')) {
      if (typeof process.env.PICO_SDK_PATH !== 'string' || filesystem.exists(process.env.PICO_SDK_PATH) !== 'dir' || system.which('picotool') === null || filesystem.exists(process.env.PIOASM ?? '') !== 'file') {
        print.error('The current environment does not appear to be set up for the pico build target. Please run `xs-dev setup --device pico` before trying again.')
        process.exit(1)
      }
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
    `Building${deployStatus !== 'none' ? ' and deploying project' : ''
    } ${projectPath} on ${targetPlatform}`
  )

  const configArgs = [
    '-m',
    `-p ${targetPlatform}`,
    `-t ${deployStatus === 'run' ? 'all' : 'build'}`,
    `-o ${outputDir}`,
  ]
  if (mode === 'development') configArgs.push('-d')
  if (mode === 'production') configArgs.push('-i')

  await system.exec(`mcconfig ${configArgs.join(' ')}`, {
    cwd: projectPath,
    process,
  })

  if (deployStatus === 'push') {
    await system.exec(
      `mcconfig -t deploy -p ${targetPlatform} -o ${outputDir}`,
      {
        cwd: projectPath,
        process,
      }
    )
  }

  spinner.stop()

  if (deployStatus !== 'none' && targetPlatform === 'wasm') {
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
