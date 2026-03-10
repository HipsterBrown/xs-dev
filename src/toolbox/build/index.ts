import { type as platformType } from 'node:os'
import { createServer } from 'http'
import { readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import handler from 'serve-handler'
import { execaCommand } from '../system/execa.js'
import { collectChoicesFromTree } from '../prompt/choices.js'
import { moddableExists } from '../setup/moddable.js'
import { DEVICE_ALIAS } from '../prompt/devices.js'
import type { Device } from '../../types.js'
import type { OperationEvent } from '../../lib/events.js'
import type { Prompter, Choice } from '../../lib/prompter.js'
import { sourceEnvironment, sourceIdfPythonEnv, which } from '../system/exec.js'

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

interface TreeNode {
  name: string
  type: 'dir' | 'file' | 'symlink'
  children: TreeNode[]
}

async function* inspectTree(dirPath: string): AsyncGenerator<TreeNode[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    const results = await Promise.all(
      entries.map(async (entry) => {
        const stats = await stat(resolve(dirPath, entry.name))
        const childNodes: TreeNode[] = []
        if (stats.isDirectory()) {
          for await (const children of inspectTree(resolve(dirPath, entry.name))) {
            childNodes.push(...children)
          }
        }
        const nodeType: 'dir' | 'file' | 'symlink' = stats.isDirectory()
          ? 'dir'
          : stats.isSymbolicLink()
            ? 'symlink'
            : 'file'
        return {
          name: entry.name,
          type: nodeType,
          children: childNodes,
        }
      }),
    )
    yield results.flat()
  } catch {
    yield []
  }
}

export default async function* build(
  {
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
    config = {},
  }: BuildArgs,
  prompter: Prompter,
): AsyncGenerator<OperationEvent> {
  const OS = platformType().toLowerCase() as Device

  await sourceEnvironment()

  if (!moddableExists()) {
    yield {
      type: 'step:fail',
      message: `Moddable tooling required. Run 'xs-dev setup --device ${DEVICE_ALIAS[OS]}' before trying again.`,
    }
    return
  }

  outputDir ??= resolve(String(process.env.MODDABLE), 'build')

  if (listDevices) {
    const deviceTargetsPath = resolve(
      String(process.env.MODDABLE),
      'build',
      'devices',
    )
    const simulatorsPath = resolve(
      String(process.env.MODDABLE),
      'build',
      'simulators',
    )

    let deviceTargets: string[] = []
    for await (const devices of inspectTree(deviceTargetsPath)) {
      deviceTargets = devices.flatMap((dev) => {
        const targets = dev.children
          .filter((c) => c.name === 'targets')
          .flatMap((c) =>
            c.children.flatMap((dir) => {
              return collectChoicesFromTree(dir, [], `${dev.name}/`)
            }),
          )
        return [dev.name].concat(targets)
      })
    }

    let simulators: string[] = []
    for await (const simDirs of inspectTree(simulatorsPath)) {
      simulators = simDirs.flatMap((sim) =>
        collectChoicesFromTree(sim, [], `simulator/`),
      )
    }

    const choices: Array<Choice<string>> = deviceTargets
      .concat(simulators, 'wasm', DEVICE_ALIAS[OS])
      .map((c) => ({ label: c, value: c }))

    const selectedDevice = await prompter.select('Here are the available target devices:', choices)

    if (selectedDevice !== '' && selectedDevice !== undefined) {
      targetPlatform = selectedDevice
    } else {
      yield { type: 'warning', message: 'Please select a target device to run' }
      return
    }
  }

  if (targetPlatform !== '') {
    const startsWithSimulator = targetPlatform.startsWith('simulator')
    if (targetPlatform.includes('esp32') && !startsWithSimulator) {
      if (!(typeof process.env.IDF_PATH === 'string')) {
        yield {
          type: 'step:fail',
          message:
            'The current environment does not appear to be set up for the ESP32 build target. Please run `xs-dev setup --device esp32` before trying again.',
        }
        return
      }
      await sourceIdfPythonEnv()
    } else if (targetPlatform.includes('esp') && !startsWithSimulator) {
      if (!(typeof process.env.ESP_BASE === 'string')) {
        yield {
          type: 'step:fail',
          message:
            'The current environment does not appear to be set up for the ESP8266 build target. Please run `xs-dev setup --device esp8266` before trying again.',
        }
        return
      }
    }

    if (targetPlatform.includes('wasm') && !startsWithSimulator) {
      if (
        !(process.env.PATH ?? '').includes('binaryen') ||
        typeof process.env.EMSDK !== 'string' ||
        typeof process.env.EMSDK_NODE !== 'string' ||
        typeof process.env.EMSDK_PYTHON !== 'string'
      ) {
        yield {
          type: 'step:fail',
          message:
            'The current environment does not appear to be set up for the wasm build target. Please run `xs-dev setup --device wasm` before trying again.',
        }
        return
      }
    }

    if (targetPlatform.includes('pico') && !startsWithSimulator) {
      if (
        !(typeof process.env.PICO_SDK_PATH === 'string') ||
        typeof process.env.PIOASM !== 'string'
      ) {
        yield {
          type: 'step:fail',
          message:
            'The current environment does not appear to be set up for the pico build target. Please run `xs-dev setup --device pico` before trying again.',
        }
        return
      }
    }

    if (targetPlatform.includes('nrf52') && !startsWithSimulator) {
      if (
        typeof process.env.NRF_ROOT !== 'string' ||
        typeof process.env.NRF_SDK_DIR !== 'string'
      ) {
        yield {
          type: 'step:fail',
          message:
            'The current environment does not appear to be set up for the nrf52 build target. Please run `xs-dev setup --device nrf52` before trying again.',
        }
        return
      }
    }

    if (targetPlatform.includes('zephyr') && !startsWithSimulator) {
      if (typeof process.env.ZEPHYR_BASE !== 'string') {
        yield {
          type: 'step:fail',
          message:
            'The current environment does not appear to be set up for the zephyr build target. Please run `xs-dev setup --device zephyr` before trying again.',
        }
        return
      }
    }
  }

  if (listExamples) {
    const exampleProjectPath = resolve(
      String(process.env.MODDABLE),
      'examples',
    )
    const contributedProjectPath = resolve(
      String(process.env.MODDABLE),
      'contributed',
    )

    const choicesList: string[] = []

    for await (const examples of inspectTree(exampleProjectPath)) {
      choicesList.push(
        ...examples.flatMap((example) => collectChoicesFromTree(example)),
      )
    }

    for await (const contributed of inspectTree(contributedProjectPath)) {
      choicesList.push(
        ...contributed.flatMap((project) => collectChoicesFromTree(project)),
      )
    }

    const choices: Array<Choice<string>> = choicesList.map((c) => ({ label: c, value: c }))
    const selectedExample = await prompter.select('Here are the available examples:', choices)

    if (selectedExample !== '' && selectedExample !== undefined) {
      yield { type: 'info', message: `Running the example: xs-dev run --example ${selectedExample}` }
      projectPath = resolve(exampleProjectPath, selectedExample)
    } else {
      yield { type: 'warning', message: 'Please select an example to run.' }
      return
    }
  }

  if (example !== undefined) {
    const exampleProjectPath = resolve(
      String(process.env.MODDABLE),
      'examples',
      example,
    )
    const contributedProjectPath = resolve(
      String(process.env.MODDABLE),
      'contributed',
      example,
    )

    let exampleExists = false
    let exampleHasManifest = false
    let isExampleDir = false

    try {
      const exampleStat = await stat(exampleProjectPath)
      exampleExists = true
      isExampleDir = exampleStat.isDirectory()

      const manifestPath = resolve(exampleProjectPath, 'manifest.json')
      try {
        const manifestStat = await stat(manifestPath)
        exampleHasManifest = manifestStat.isFile()
      } catch {
        // manifest doesn't exist
      }
    } catch {
      // example path doesn't exist
    }

    if (!exampleExists) {
      try {
        await stat(contributedProjectPath)
      } catch {
        yield {
          type: 'step:fail',
          message: 'Example project does not exist.',
        }
        yield {
          type: 'info',
          message: 'Lookup the available examples: xs-dev run --list-examples',
        }
        return
      }
    }

    if (!exampleHasManifest) {
      try {
        const manifestPath = resolve(contributedProjectPath, 'manifest.json')
        await stat(manifestPath)
      } catch {
        yield {
          type: 'step:fail',
          message: 'Example project must contain a manifest.json.',
        }
        yield {
          type: 'info',
          message: 'Lookup the available examples: xs-dev run --list-examples',
        }
        return
      }
    }

    projectPath = isExampleDir ? exampleProjectPath : contributedProjectPath
  }

  if (port !== undefined) {
    process.env.UPLOAD_PORT = port
  }

  let statusMessage = ''
  switch (deployStatus) {
    case 'clean':
      statusMessage = `Cleaning up build artifacts for project ${projectPath} on ${targetPlatform}`
      break
    case 'debug':
      statusMessage = `Connecting to running debug session for ${projectPath} on ${targetPlatform}`
      break
    default:
      statusMessage = `Building${deployStatus !== 'none' ? ' and deploying project' : ''} ${projectPath} on ${targetPlatform}`
  }

  yield { type: 'step:start', message: statusMessage }

  const configArgs = [
    '-m',
    `-p ${targetPlatform}`,
    `-t ${DEPLOY_TARGET[deployStatus]}`,
    `-o ${outputDir}`,
  ]
  if (mode === 'development') {
    configArgs.push('-d')
  }
  if (mode === 'production') {
    configArgs.push('-i')
  }
  if (log) {
    configArgs.push('-l')
  }

  Object.entries(config).forEach(([element, value]) => {
    configArgs.push(`${element}="${value}"`)
  })

  let canUseMCPack = false
  if (which('mcpack') !== null) {
    try {
      await stat(resolve(projectPath, 'package.json'))
      canUseMCPack = true
    } catch {
      canUseMCPack = false
    }
  }

  let rootCommand = 'mcconfig'

  if (canUseMCPack) {
    rootCommand = 'mcpack'
    configArgs.unshift('mcconfig')
  }

  try {
    const command = `${rootCommand} ${configArgs.join(' ')}`
    await execaCommand(command, {
      cwd: projectPath,
      stdio: 'inherit',
      shell: true,
    })
  } catch (error) {
    if (error instanceof Error && !error.message.includes('exit code 2')) {
      yield { type: 'step:fail', message: String(error) }
      return
    }
  }

  if (deployStatus === 'push') {
    try {
      const deployCommand = `mcconfig -t deploy -p ${targetPlatform} -o ${outputDir}`
      await execaCommand(deployCommand, {
        cwd: projectPath,
        stdio: 'inherit',
        shell: true,
      })
    } catch (error) {
      if (error instanceof Error) {
        yield { type: 'step:fail', message: String(error) }
        return
      }
    }
  }

  yield { type: 'step:done', message: 'Build completed' }

  if (deployStatus !== 'none' && targetPlatform === 'wasm') {
    const buildName = String(projectPath.split('/').pop())
    const debugPath = resolve(
      String(process.env.MODDABLE),
      'build',
      'bin',
      'wasm',
      'debug',
      buildName,
    )
    yield {
      type: 'info',
      message:
        'Started server on port 8080, go to http://localhost:8080 in your browser to view the simulator',
    }
    createServer((req, res) => {
      void handler(req, res, { public: debugPath })
    }).listen(8080)
  }
}
