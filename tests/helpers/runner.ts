import { mock } from 'node:test';
import { tmpdir } from 'node:os'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { run } from '@stricli/core';
import {
  filesystem,
  strings,
  system,
  semver,
  http,
  patching,
  prompt,
  packageManager,
} from 'gluegun'


export function buildFakeContext(options = {}) {
  let exitCode;
  const context = {
    process: {
      stdout: {
        write: mock.fn(),
      },
      stderr: {
        write: mock.fn(),
      },
      env: options.env ?? {},
      exit: (code) => {
        exitCode = code;
      },
      exitCode: () => exitCode,
    },
    print: {
      info: mock.fn(),
      highlight: mock.fn(),
      warning: mock.fn(),
      error: mock.fn(),
      success: mock.fn(),
      table: mock.fn(),
    },
    filesystem,
    strings,
    system,
    semver,
    http,
    patching,
    prompt,
    packageManager,
    currentVersion: 'test',
  };
  return context;
}

export async function runWithInputs(app, inputs, ...args) {
  const context = buildFakeContext(...args);
  await run(app, inputs, context);
  const stdout = [
    context.process.stdout.write,
    context.print.info,
    context.print.warning,
    context.print.success,
    context.print.highlight,
    context.print.table,
  ].flatMap(fn => {
    return fn.mock.calls?.[0]?.arguments ?? [];
  }).join("");
  return {
    stdout,
    stderr: context.process.stderr.write.mock.calls?.[0]?.arguments?.join(""),
    exitCode: context.process.exitCode(),
  };
}

export async function createTempDir() {
  return await mkdtemp(join(tmpdir(), 'xs-dev-test-'))
}

export async function cleanupTempDir(dir) {
  await rm(dir, { recursive: true, force: true })
}
