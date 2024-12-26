import { writeFile } from 'node:fs/promises'

export interface TemplateBuilderOptions {
  target: string
}

export interface CreateManifestOptions extends TemplateBuilderOptions {
  includes: string
  defines: string
}

export interface CreatePackageJSONOptions extends TemplateBuilderOptions {
  io: boolean
  projectName: string
  typescript: boolean
}

export interface CreateMainOptions extends TemplateBuilderOptions {
  legacy: boolean
}

export async function createManifest({
  target,
  includes,
  defines,
}: CreateManifestOptions): Promise<void> {
  const template = `\
{
  "include": [
    ${includes}
  ],
  "modules": {
    "*": "./main"
  }${defines}
}
`
  await writeFile(target, template, { encoding: 'utf8' })
}

export async function createPackageJSON({
  target,
  io,
  projectName,
  typescript,
}: CreatePackageJSONOptions): Promise<void> {
  const name = projectName.split('/').pop()
  const scripts: Record<string, string> = {
    build: 'xs-dev build',
    start: 'xs-dev run',
  }
  const devDependencies: Record<string, string> = {}
  const moddable: Record<string, unknown> = {}
  const packageJSON = {
    name,
    main: typescript ? 'dist/main.js' : 'main.js',
    type: 'module',
    description: 'A starter project for embedded JS',
    scripts,
    devDependencies,
    moddable,
  }

  if (typescript) {
    packageJSON.scripts.prebuild = 'tsc'
    packageJSON.scripts.prestart = packageJSON.scripts.prebuild

    packageJSON.devDependencies['@moddable/typings'] = '^5.3.0'
    packageJSON.devDependencies.typescript = '^5.7.2'
  }

  if (io) {
    packageJSON.moddable = {
      manifest: {
        build: {
          MODULES: '$(MODDABLE)/modules',
        },
        include: ['$(MODULES)/io/manifest.json'],
      },
    }
  }

  await writeFile(target, JSON.stringify(packageJSON, null, 2), {
    encoding: 'utf8',
  })
}

export async function createTSConfig({
  target,
}: TemplateBuilderOptions): Promise<void> {
  const tsconfig = {
    compilerOptions: {
      incremental: true,
      lib: ['es2022'],
      outDir: 'dist',
      module: 'es2022',
      sourceMap: true,
      target: 'ES2022',
      checkJs: true,
      baseUrl: '.',
      paths: {
        '*': ['*', 'node_modules/@moddable/typings/*'],
      },
      types: [
        './node_modules/@moddable/typings/xs',
        './node_modules/@moddable/typings/mcpack',
        './node_modules/@moddable/typings/embedded_provider/builtin.d.ts',
        './node_modules/@moddable/typings/embedded_io/_common.d.ts',
        './node_modules/@moddable/typings/embedded_io/analog.d.ts',
        './node_modules/@moddable/typings/embedded_io/digital.d.ts',
        './node_modules/@moddable/typings/embedded_io/digitalbank.d.ts',
        './node_modules/@moddable/typings/embedded_io/i2c.d.ts',
        './node_modules/@moddable/typings/embedded_io/pulsecount.d.ts',
        './node_modules/@moddable/typings/embedded_io/pwm.d.ts',
        './node_modules/@moddable/typings/embedded_io/serial.d.ts',
        './node_modules/@moddable/typings/embedded_io/smbus.d.ts',
        './node_modules/@moddable/typings/embedded_io/spi.d.ts',
        './node_modules/@moddable/typings/embedded_io/system.d.ts',
        './node_modules/@moddable/typings/global.d.ts',
      ],
    },
  }
  await writeFile(target, JSON.stringify(tsconfig, null, 2), {
    encoding: 'utf8',
  })
}

export async function createMain({
  target,
  legacy,
}: CreateMainOptions): Promise<void> {
  const template = `\
debugger;

const message = "Hello, world - sample";
${legacy ? 'trace(message)' : 'console.log(message)'};
`

  await writeFile(target, template, { encoding: 'utf8' })
}
