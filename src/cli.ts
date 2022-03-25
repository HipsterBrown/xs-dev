import type { GluegunToolbox } from 'gluegun'
import { build } from 'gluegun'

/**
 * Create the cli and kick it off
 */
async function run(argv: string[]): Promise<GluegunToolbox> {
  // create a CLI runtime
  const cli = build()
    .brand('xs-dev')
    .src(__dirname)
    .help() // provides default for help, h, --help, -h
    .version() // provides default for version, v, --version, -v
    .checkForUpdates(25)
    .create()
  // enable the following method if you'd like to skip loading one of these core extensions
  // this can improve performance if they're not necessary for your project:
  // .exclude(['meta', 'strings', 'print', 'filesystem', 'semver', 'system', 'prompt', 'http', 'template', 'patching', 'package-manager'])
  // and run it
  return await cli.run(argv)
}

module.exports = { run }
