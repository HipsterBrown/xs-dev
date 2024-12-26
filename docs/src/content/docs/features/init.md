---
title: Init
description: Scaffold new Moddable projects
---

# Scaffold new Moddable projects

The default template creates a `main.js` and minimally configured `package.json` for running in the simulator.

```
xs-dev init my-project
```

## Manifest

The `--manifest` flag will create a project with the `manifest.json` file for Moddable project configuration over the default `package.json`:

```
xs-dev init --manifest my-manifest-project
```

## TypeScript

The `--typescript` flag will create a project with Moddable types and a `main.ts` to get started, as well as the necessary scripts to build the TypeScript before running:

```
xs-dev init --typescript my-typed-project
```

## IO (ECMA 419)

The `--io` flag sets up the project to use the [TC53 IO manifest](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/io/io.md) in the generated `package.json` or `manifest.json`:

```
xs-dev init --io my-io-project
```

## asyncMain

The `--asyncMain` flag will enable top-level await (TLA) in your project's entry file. In XS, TLA is only be available in imported modules by default.

```
xs-dev init --asyncMain my-io-project
```

## Moddable example

For the `--example` flag, it can be used as a boolean to select a project from the list of available [Moddable examples](https://github.com/Moddable-OpenSource/moddable/tree/public/examples):

```
xs-dev init --example my-example-project
```

Or select from a filtered list of projects:

```
xs-dev init --example http my-http-project
```

Or if the complete example name is passed, it will be selected by default:

```
xs-dev init --example network/mqtt/mqttbasic my-mqtt-project
```

## Overwrite

An existing directory matching the project name can be overwritten with the `--overwrite` flag:

```
xs-dev init --overwrite my-existing-project
```
