import { writeFile } from 'node:fs/promises'

export interface TemplateBuilderOptions {
  target: string;
}

export interface CreateManifestOptions extends TemplateBuilderOptions {
  includes: string;
  defines: string;
}
export async function createManifest({ target, includes, defines }: CreateManifestOptions): Promise<void> {
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

export async function createMain({ target }: TemplateBuilderOptions): Promise<void> {
  const template = `\
debugger;

let message = "Hello, world - sample";
trace(message);
`

  await writeFile(target, template, { encoding: 'utf8' })
}
