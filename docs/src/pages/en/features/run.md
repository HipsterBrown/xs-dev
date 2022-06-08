---
title: Run
description: Build and run Moddable projects or examples
layout: ../../../layouts/MainLayout.astro
---

# Run Moddable projects

Within a project directory, the `run` command will invoke [`mcconfig`](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#mcconfig) to generate the `make` file based on the `manifest.json` followed by building and running the project in the current environment simulator:

```
xs-dev run
```

When not in the project directory, a path can be passed to `run`:

```
xs-dev run path/to/project
```

## Moddable examples

Use the `--example` flag to run a project included with the Moddable SDK:

```
xs-dev run --example helloworld
```

The `--list-examples` provides a searchable list of available example projects:

```
xs-dev run --list-examples
```

## Select a device target

The `--device` flag allows for selecting a supported [device or simulator target](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#arguments):

```
xs-dev run --device esp32
```

To dynamically select the device, use the `--list-devices` flag:

```
xs-dev run --list-devices
```

This can be used in tandem with the `--example` or `--list-examples` flags to run an example project on a connected device:

```
xs-dev run --list-devices --list-examples
```

## Select a port address

The `--port` flag accepts a path to port for connected device (defaults to: `UPLOAD_PORT` environment variable):

```
xs-dev run --port /dev/cu.usbserial-0001 --device esp8266
```

_This value can be discovered using the [`scan`](./scan) command._
