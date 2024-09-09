import { spawn } from 'node:child_process'
import { type as platformType } from 'node:os'
import handler from 'serve-handler'
import { createServer } from 'http'
import { filesystem, print, prompt, system } from 'gluegun'
import { collectChoicesFromTree } from '../prompt/choices'
import { moddableExists } from '../setup/moddable'
import { DEVICE_ALIAS } from '../prompt/devices'
import type { Device } from '../../types'
import { sourceEnvironment, sourceIdfPythonEnv } from '../system/exec'

export type DeployStatus = 'none' | 'run' | 'push' | 'clean' | 'debug'

export interface BuildArgs {
  port?: string
  example?: string
  listExamples: boolean
  listDevices: boolean
  log?: boolean
  projectPath: string
  targetPlatform: string
  mode: 'development' | 'production'
  deployStatus: DeployStatus
  outputDir?: string
  config?: Record<string, string>
}

const DEPLOY_TARGET: Readonly<Record<DeployStatus, string>> = Object.freeze({
  clean: 'clean',
  debug: 'xsbug',
  none: 'build',
  push: 'build',
  run: 'all',
})

export async function build({
  listDevices,
  port,
  example,
  listExamples,
  log = false,
  projectPath,
  targetPlatform,
  mode,
  deployStatus,
  outputDir,
  config = {}
}: BuildArgs): Promise<void> {
  const OS = platformType().toLowerCase() as Device

  await sourceEnvironment()

  if (!moddableExists()) {
    print.error(
      `Moddable tooling required. Run 'xs-dev setup --device ${DEVICE_ALIAS[OS]}' before trying again.`
    )
    process.exit(1)
  }

  outputDir ??= filesystem.resolve(String(process.env.MODDABLE), 'build')

  if (listDevices) {
    const deviceTargetsPath = filesystem.resolve(String(process.env.MODDABLE), 'build', 'devices')
    const simulatorsPath = filesystem.resolve(String(process.env.MODDABLE), 'build', 'simulators')
    const devices = filesystem.inspectTree(deviceTargetsPath)?.children ?? []
    const deviceTargets = devices.flatMap(dev => {
      const targets = dev.children
        .filter(c => c.name === 'targets')
        .flatMap(c => c.children.flatMap(dir => collectChoicesFromTree(dir, [], `${dev.name}/`)))
      return [dev.name].concat(targets)
    })
    const simulators = filesystem.inspectTree(simulatorsPath)?.children?.flatMap(sim => collectChoicesFromTree(sim, [], `simulator/`)) ?? []
    const choices = deviceTargets.concat(simulators, 'wasm', DEVICE_ALIAS[OS])
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
    const startsWithSimulator = targetPlatform.startsWith('simulator')
    if (targetPlatform.includes('esp32') && !startsWithSimulator) {
      if (typeof process.env.IDF_PATH !== 'string' || filesystem.exists(process.env.IDF_PATH) !== 'dir') {
        print.error('The current environment does not appear to be set up for the ESP32 build target. Please run `xs-dev setup --device esp32` before trying again.')
        process.exit(1)
      } else {
        await sourceIdfPythonEnv()
      }
    } else if (targetPlatform.includes('esp') && !startsWithSimulator) {
      if (typeof process.env.ESP_BASE !== 'string' || filesystem.exists(process.env.ESP_BASE) !== 'dir') {
        print.error('The current environment does not appear to be set up for the ESP8266 build target. Please run `xs-dev setup --device esp8266` before trying again.')
        process.exit(1)
      }
    }

    if (targetPlatform.includes('wasm') && !startsWithSimulator) {
      if (!(process.env.PATH ?? '').includes('binaryen') || filesystem.exists(process.env.EMSDK ?? '') !== 'dir' || filesystem.exists(process.env.EMSDK_NODE ?? '') !== 'file' || filesystem.exists(process.env.EMSDK_PYTHON ?? '') !== 'file') {
        print.error('The current environment does not appear to be set up for the wasm build target. Please run `xs-dev setup --device wasm` before trying again.')
        process.exit(1)
      }
    }

    if (targetPlatform.includes('pico') && !startsWithSimulator) {
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
    const contributedProjectPath = filesystem.resolve(
      String(process.env.MODDABLE),
      'contributed'
    )
    const examples = filesystem.inspectTree(exampleProjectPath)?.children
    const contributed = filesystem.inspectTree(contributedProjectPath)?.children
    const choices =
      examples !== undefined
        ? examples.map((example) => collectChoicesFromTree(example)).flat()
        : []
    if (contributed !== undefined) choices.push(...contributed.flatMap(project => collectChoicesFromTree(project)))
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
    const contributedProjectPath = filesystem.resolve(
      String(process.env.MODDABLE),
      'contributed',
      example
    )
    if (filesystem.exists(exampleProjectPath) === false && filesystem.exists(contributedProjectPath) === false) {
      print.error('Example project does not exist.')
      print.info(`Lookup the available examples: xs-dev run --list-examples`)
      process.exit(1)
    }
    if (
      filesystem.exists(
        filesystem.resolve(exampleProjectPath, 'manifest.json')
      ) === false && filesystem.exists(filesystem.resolve(contributedProjectPath, 'manifest.json')) === false
    ) {
      print.error('Example project must contain a manifest.json.')
      print.info(`Lookup the available examples: xs-dev run --list-examples`)
      process.exit(1)
    }
    projectPath = filesystem.exists(exampleProjectPath) === 'dir' ? exampleProjectPath : contributedProjectPath
  }

  if (port !== undefined) {
    process.env.UPLOAD_PORT = port
  }

  const spinner = print.spin()

  switch (deployStatus) {
    case 'clean':
      spinner.start(`Cleaning up build artifacts for project ${projectPath} on ${targetPlatform}\n`)
      break;
    case 'debug':
      spinner.start(`Connecting to running debug session for ${projectPath} on ${targetPlatform}\n`)
      break;
    default:
      spinner.start(
        `Building${deployStatus !== 'none' ? ' and deploying project' : ''
        } ${projectPath} on ${targetPlatform}\n`
      )
  }

  const configArgs = [
    '-m',
    `-p ${targetPlatform}`,
    `-t ${DEPLOY_TARGET[deployStatus]}`,
    `-o ${outputDir}`,
  ]
  if (mode === 'development') configArgs.push('-d')
  if (mode === 'production') configArgs.push('-i')
  if (log) configArgs.push('-l')

  Object.entries(config).forEach(([element, value]) => {
    configArgs.push(`${element}="${value}"`)
  })

  const canUseMCPack = system.which('mcpack') !== null && filesystem.exists(filesystem.resolve(projectPath, 'package.json')) === 'file'
  let rootCommand = 'mcconfig'

  if (canUseMCPack) {
    rootCommand = 'mcpack'
    configArgs.unshift('mcconfig')
  }

  if (log) {
    const logOutput = spawn(rootCommand, configArgs, { cwd: projectPath, stdio: 'inherit', shell: true });
    logOutput.on('close', (exitCode) => {
      if (exitCode !== null) {
        process.exit(exitCode)
      }
    })
  } else {
    process.on('SIGINT', () => {
      void system.exec(`pkill serial2xsbug`)
    })
    try {
      await system.exec(`${rootCommand} ${configArgs.join(' ')}`, {
        cwd: projectPath,
        stdio: 'inherit',
        shell: true,
      })
    } catch (error) {
      if (error instanceof Error && !error.message.includes('exit code 2')) {
        print.error(error)
      }
    }

    if (deployStatus === 'push') {
      await system.exec(
        `mcconfig -t deploy -p ${targetPlatform} -o ${outputDir}`,
        {
          cwd: projectPath,
          process,
        }
      )
    }
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
  } else if (!log) {
    process.exit(0)
  }
}
