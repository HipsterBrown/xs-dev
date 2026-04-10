---
title: Manifest Anatomy
description: How xs-dev project configuration works with package.json and manifest.json
---

Embedded JS projects are configured through a manifest — a description of what modules to include and how to build them. There are two ways to provide that configuration: a `moddable` field in `package.json` (the default), or a standalone `manifest.json` file (the Moddable SDK convention). This page explains both.

## Manifest field reference

The `moddable` field in `package.json` and a standalone `manifest.json` share the same structure. The commonly used fields are:

| Field | Type | Description |
|-------|------|-------------|
| `build` | object | Defines path variables used elsewhere in the manifest via `$(VAR)` syntax. For example, `"MODULES": "$(MODDABLE)/modules"` creates a `$(MODULES)` shorthand. |
| `include` | array of strings | Paths to other manifest files to merge into this build. Used to pull in SDK module bundles (for example, `"$(MODULES)/io/manifest.json"`). |
| `modules` | object | Maps module names to source file paths, making them importable in your JS with `import Foo from "foo"`. |
| `config` | object | Key-value pairs passed to the `mc/config` module, accessible at runtime via `import config from "mc/config"`. |
| `platforms` | object | Platform-specific overrides. Keys are platform strings (for example, `esp32`, `gecko`). Each value follows the same manifest structure. |

## The `package.json` approach

When you run `xs-dev init`, the generated project uses `package.json` as the single configuration file. The xs-dev-specific configuration lives in a top-level `moddable` field — think of it as the embedded equivalent of a `jest` or `eslint` config block.

A minimal project without any extra modules looks like this:

```json
{
  "name": "my-project",
  "main": "main.js",
  "type": "module",
  "description": "A starter project for embedded JS",
  "scripts": {
    "build": "xs-dev build",
    "start": "xs-dev run"
  },
  "devDependencies": {},
  "moddable": {}
}
```

An empty `moddable` object is enough to let xs-dev know this is a Moddable project. xs-dev reads this field and passes it through to `mcconfig`, the underlying Moddable SDK build tool.

### IO support

The [ECMA-419](https://419.ecma-international.org/) IO APIs — the standard for hardware IO in embedded JavaScript — are included by default when you run `xs-dev init`. The generated `moddable` field pulls in the IO module bundle automatically:

```
xs-dev init my-project
```

The resulting `moddable` field looks like this:

```json
"moddable": {
  "manifest": {
    "build": {
      "MODULES": "$(MODDABLE)/modules"
    },
    "include": [
      "$(MODULES)/io/manifest.json"
    ]
  }
}
```

Breaking down each field:

- **`build.MODULES`** — defines a path variable pointing to the Moddable SDK's built-in modules directory. `$(MODDABLE)` is an environment variable set by `xs-dev setup` that points to your local SDK installation. This variable can then be referenced as `$(MODULES)` elsewhere in the manifest.
- **`include`** — an array of other manifest files to pull into the build. Each entry is a path to a `manifest.json` from the Moddable SDK or another module. Adding an entry here is roughly analogous to adding a dependency in `package.json` — it makes that module's code available to your project.

The `$(MODULES)/io/manifest.json` entry specifically includes the TC53 IO module bundle, which gives your code access to `device.io.Digital`, `device.io.I2C`, and related hardware APIs.

## Adding modules

The `include` array is the main extension point. To add more Moddable SDK modules to your project, append their manifest paths to the array:

```json
"moddable": {
  "manifest": {
    "build": {
      "MODULES": "$(MODDABLE)/modules"
    },
    "include": [
      "$(MODULES)/io/manifest.json",
      "$(MODULES)/network/wifi/manifest.json"
    ]
  }
}
```

The [`xs-dev include` command](/features/include) can do this for you interactively, so you rarely need to edit the array by hand.

## The `manifest.json` approach

Moddable SDK examples and older projects use a standalone `manifest.json` file instead of embedding configuration in `package.json`. When xs-dev does not find a `moddable.manifest` field in `package.json`, it falls back to looking for `manifest.json` in the project directory.

You can also generate a `manifest.json`-based project directly:

```
xs-dev init --manifest my-manifest-project
```

A minimal `manifest.json` looks like this:

```json
{
  "include": [
    "$(MODDABLE)/examples/manifest_base.json"
  ],
  "modules": {
    "*": "./main"
  }
}
```

The structure is the same as the `manifest` object inside the `moddable` field — `include`, `build`, `modules`, and so on are all first-class keys here rather than being nested under `moddable.manifest`.

You will encounter this format when reading Moddable SDK examples or third-party modules. Understanding it helps you translate those examples into a `package.json`-based project, or simply copy a working example and run it directly with xs-dev.
