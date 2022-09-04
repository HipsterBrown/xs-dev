---
title: Init
description: Scaffold new Moddable projects
layout: ../../../layouts/MainLayout.astro
---

# Scaffold new Moddable projects

The default template creates a `main.js` and minimally configured `manifest.json` for running in the simulator.

```
xs-dev init my-project
```

## TypeScript

The `--typescript` flag will create a project with Moddable types and a `main.ts` to get started:

```
xs-dev init my-typed-project --typescript
```

## IO (ECMA 419)

The `--io` flag sets up the project to use the [TC53 IO manifest](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/io/io.md) in the generated `mainfest.json`:

```
xs-dev init my-io-project --io
```

## asyncMain

The `--asyncMain` flag will enable top level await in your project's entry file. In XS, TLA is only be available in imported modules by default.

```
xs-dev init my-io-project --asyncMain
```

## Moddable example

For the `--example` flag, it can be used as a boolean to select a project from the list of available [Moddable examples](https://github.com/Moddable-OpenSource/moddable/tree/public/examples):

```
xs-dev init my-example-project --example
```

Or select from a filtered list of projects:

```
xs-dev init my-http-project --example http
```

Or if the complete example name is passed, it will be selected by default:

```
xs-dev init my-mqtt-project --example network/mqtt/mqttbasic
```

## Overwrite

An existing directory matching the project name can be overwritten with the `--overwrite` flag:

```
xs-dev init my-existing-project --overwrite
```
