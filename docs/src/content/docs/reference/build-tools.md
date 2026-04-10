---
title: Build Tools
description: Understanding mcconfig, mcrun, mcpack and how xs-dev wraps them
---

## Overview

The Moddable SDK ships with a set of low-level command-line build tools: `mcconfig`, `mcrun`, and `mcpack`. In normal development with xs-dev, you will not call these directly. `xs-dev run`, `xs-dev build`, and `xs-dev debug` act as a higher-level interface that invokes the right tool with the right flags based on your project and target device.

Think of the relationship the same way you think of Vite and `package.json` scripts: `package.json` scripts give you a consistent, project-aware interface while Vite handles the actual bundling and dev server. `xs-dev` is the scripts layer; `mcconfig` (and friends) is the build engine underneath.

## The Low-Level Tools

### mcconfig

`mcconfig` is the primary build tool. It reads your project's `manifest.json`, generates a `Makefile`, and then drives the compile-and-deploy pipeline. It accepts arguments that control the target platform, output directory, build mode, and per-module configuration values.

This is the tool that `xs-dev run` and `xs-dev build` call under the hood.

### mcrun

`mcrun` builds and runs *mods* — lightweight `.xsa` archives of JS bytecode and assets that can be installed on a device without reflashing the firmware. Reach for `mcrun` instead of `mcconfig` when your changes are logic-only (no native C code): the mod is pushed over the existing firmware, which dramatically shortens the edit-compile-run cycle. Because mods run on top of an already-flashed host, they cannot contain native extensions; all hardware access goes through the modules the host exposes. xs-dev does not currently invoke `mcrun`; if you need to use it, you would call it directly.

### mcpack

`mcpack` is a build-time preprocessor for `package.json`-based projects. It bridges npm-style project structure with the Moddable build pipeline and forwards its arguments to `mcconfig` (for example, `mcpack mcconfig -d -m -p esp32/nodemcu`). `mcpack` is not a standalone compiler; it is an optional layer that you opt into by having a `package.json` present and `mcpack` on your PATH. It is the recommended entry point when you are starting from an npm-style project or when you want to share code between a device target and a Node.js host using the `"moddable"` package import condition.

## How xs-dev Wraps Them

When you run `xs-dev run`, the CLI:

1. Resolves the project path (defaults to the current directory).
2. Determines the target platform from `--device` (defaults to the current OS simulator).
3. Resolves device aliases to the platform strings that `mcconfig` expects (for example, `esp32` maps to `esp32/sim` on a Mac simulator, and the real platform identifier for a physical device).
4. Translates `--port`, `--output`, `--mode`, and `--config key=value` flags into the corresponding `mcconfig` arguments.
5. Invokes `mcconfig` with those arguments and streams the output back to your terminal.

`xs-dev build` follows the same path but sets the deploy status to `none` by default (add `--deploy` to flash to a device after building). When `--mode production` is passed, `mcconfig` is invoked with the production/release flags rather than the debug flags.

The `--config` flag is variadic and accepts multiple `key=value` pairs, which are forwarded to the `mc/config` module. This is the standard mechanism for supplying runtime configuration such as Wi-Fi credentials without hardcoding them in source:

```
xs-dev run --example network/http/httpgetjson \
  --device esp32 \
  --config ssid=MyNetwork \
  --config password="hunter2"
```

The equivalent raw `mcconfig` invocation would require knowing the exact platform string, the correct flag syntax, and the location of the Moddable SDK build directory. xs-dev handles all of that so you do not have to.

## When You Might Use the Low-Level Tools Directly

Most developers never need to touch `mcconfig` directly. The cases where it becomes relevant are:

- **Custom build scripts** — if you are writing a shell script or `Makefile` that integrates the Moddable SDK into a larger pipeline, you may need `mcconfig` flags that xs-dev does not expose.
- **Diagnosing a build failure xs-dev cannot surface** — run `xs-dev run --verbose` first. If the output is still not enough, you can copy the underlying `mcconfig` invocation from the verbose output and run it directly to see the full compiler and linker output.

For full documentation on `mcconfig`, `mcrun`, and `mcpack` arguments and flags, see the [Moddable tools reference](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md).
