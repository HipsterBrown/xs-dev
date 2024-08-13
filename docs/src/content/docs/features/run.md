---
title: Build and Run
description: Build and run Moddable projects or examples
---

## Running Projects

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

_This value can be discovered using the [`scan`](/features/scan) command._

## Display debugger output in the terminal

Use the `--log` flag to display debug output in the terminal instead of opening the xsbug app:

```
xs-dev run --log
```

This will still open the "mcsim" simulator app when running locally.


## Set `mc/config` arguments

Use the `--config` flag to provide [config arguments](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#arguments) to the `mc/config` module. This mechanism is often used to configure Wi-Fi credentials when running on a device:

```
xs-dev run --example network/http/httpgetjson --device esp32 --config.ssid=mySSID --config.password="a secret"
```

## Building projects for release

Within a project directory, the `build` command takes the same flags as the `run` command to invoke [`mcconfig`](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#mcconfig) to generate the `make` file based on the `manifest.json` followed by only building the project for [the target device](#select-a-device-target):

```
xs-dev build --device esp32
```

The build `--mode` can be set to `production` for the optimized release code or `development` for the debug-enabled release code. This will default to the `NODE_ENV` environment variable or `development` if that variable is not set.

```
xs-dev build --mode production --device esp32
```

The output directory can also be set using the `--output` flag, overriding the default path of `$MODDABLE/build`, where `$MODDABLE` is the location of the Moddable tooling repo on your local filesystem.

```
xs-dev build --output ./dist --device esp32
```

If you want to immediately deploy the release build, use the `--deploy` flag:

```
xs-dev build --deploy --device esp32
```

## Connect to running debugger sessions

To conveniently restart a debugging session without redeploying the project, the `debug` command takes the same flags as the `run` command to invoke [`mcconfig`](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#mcconfig) to launch xsbug or the terminal debugger for the selected device or simulator.

```
xs-dev debug --device esp32
```

It even works with example projects:

```
xs-dev debug --example helloworld
```

The output directory can also be set using the `--output` flag, overriding the default path of `$MODDABLE/build`, where `$MODDABLE` is the location of the Moddable tooling repo on your local filesystem.

```
xs-dev debug --output ./dist --device esp32
```

## Cleaning up build artifacts

The Moddable build tooling will do it's best to avoid repeating work to ensure quick incremental updates when recompiling programs or skipping compilation entirely if no changes have been made to the source code and config files. Whether it is to force a full recompile of your project or to make space on your development machine, the `clean` command is here to help! It takes the same flags as the `build` and `run` commands (except for "port" and "deploy") to invoke [`mcconfig`](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#mcconfig) with the required `clean` target.

```
xs-dev clean --device esp32
```

The output directory can also be set using the `--output` flag, overriding the default path of `$MODDABLE/build`, where `$MODDABLE` is the location of the Moddable tooling repo on your local filesystem.

```
xs-dev clean --output ./dist --device esp32
```
