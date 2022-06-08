# CLI for automating the setup and usage of [Moddable XS tools](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/Moddable%20SDK%20-%20Getting%20Started.md)

The Moddable SDK and associated dev board tooling is incredibly empowering for embedded JS hardware development, however the set up process can be tedious to follow when getting started. This project aims to streamline the install and environment configuration requirements across platforms in just a few commands.

**This project is a work in progress and should be considered pre-1.0.**

**Feature support:**

- [X] [Moddable SDK install & setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/Moddable%20SDK%20-%20Getting%20Started.md)
- [X] [ESP32 SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/esp32.md)
- [X] [ESP8266 SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/esp8266.md)
- [X] [WASM simulator](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/wasm.md)
- [X] [Raspberry Pi Pico](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/pico.md)
- [X] Update Moddable SDK
- [X] Project management, including dependencies

**Platform support:**

- [X] Mac
- [ ] Windows
- [X] Linux

## Requirements

[Node.js >= v12](https://nodejs.org/en/)

**On Linux:**

Setup commands rely on [`ssh-askpass`](https://packages.ubuntu.com/bionic/ssh-askpass) to prompt for permission when installing other tools and dependencies.

## Install

```
npm install -g xs-dev
```

## Update

```
npm update -g xs-dev
```

## Features

### Moddable SDK setup / update / teardown

This process mostly automates the instructions provided by Moddable's "Getting Started" documentation with a few exceptions:

- it will not install XCode, just ensures the command line tools are available
- the `moddable` git repo is cloned into `~/.local/share` instead of a new/existing `~/Projects` directory
- a symlink for `xsbug.app` is created in `/Applications` for easy access through Launchpad (on Mac)

Run script for initial setup:

```
xs-dev setup
```

Run script for updating SDK:

```
xs-dev update
```

Remove all setup and environment changes with teardown command:

```
xs-dev teardown
```

### ESP32 SDK install / setup

This process automates the instructions for downloading and building the esp-idf SDK tooling. This tooling will be placed in the `~/.local/share/esp32` directory, which will be created if it doesn't exist.

Run script for platform setup:

```
xs-dev setup --device=esp32
```

Run script to confirm the setup:

```
xs-dev run --example helloworld --device=esp32
```

Flags:

- `device`: `esp8266` | `esp32` | `pico` | [any of the allowed platform identifiers](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#arguments) (defaults to current OS platform)
- `port`: path to port for connected device (defaults to: `UPLOAD_PORT` environment variable)

### ESP8266 SDK install / setup

This process automates the instructions for downloading all the dependencies for the ESP8266 RTOS SDK. These dependencies will be placed in the `~/.local/share/esp` directory, which will be created if it doesn't exist.

Run script for platform setup:

```
xs-dev setup --device=esp8266
```

Run script to confirm the setup:

```
xs-dev run --example helloworld --device=esp8266
```

Flags:

- `device`: `esp8266` | `esp32` | `pico` | [any of the allowed platform identifiers](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#arguments) (defaults to current OS platform)
- `port`: path to port for connected device (defaults to: `UPLOAD_PORT` environment variable)

### Wasm Simulator install / setup

This process automates the instructions for downloading all the dependencies for the [wasm simulator](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/wasm.md) and building the Moddable tooling. These dependencies will be placed in `~/.local/share/wasm`, which will be created if it doesn't exist.

Run script for platform setup:

```
xs-dev setup --device=wasm
```

_If there are issues building the Moddable wasm tools, please try running `eval $SHELL` or starting a new shell insance before running the setup script again._


Run script to confirm the setup:

```
xs-dev run --example helloworld --device=wasm
```

### Raspberry Pi Pico SDK install / setup

This process automates the instructions for downloading all the dependencies for the Pico SDK. These dependencies will be placed in the `~/.local/share/pico` directory, which will be created if it doesn't exist. It will also include the [`picotool` CLI](https://github.com/raspberrypi/picotool) to help with scanning for connected devices.

Run script for platform setup:

```
xs-dev setup --device=pico
```

Run script to confirm the setup:

```
xs-dev run --example helloworld --device=pico
```

Flags:

- `device`: `esp8266` | `esp32` | `pico` | [any of the allowed platform identifiers](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#arguments) (defaults to current OS platform)
- `port`: path to port for connected device (defaults to: `UPLOAD_PORT` environment variable)

### Run Moddable examples

While it is still possible to run the Moddable example projects in the documented workflow:

```
cd $MODDABLE/examples/<example directory>
mcconfig -d -m -p <platform here>
```

This tool aims to simplify that process.

List available examples:
```
xs-dev run --list-examples
```

Run an example:
```
xs-dev run --example helloworld
```

Flags:

- `device`: `esp8266` | `esp32` | `pico` | [any of the allowed platform identifiers](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#arguments) (defaults to current OS platform)
- `port`: path to port for connected device (defaults to: `UPLOAD_PORT` environment variable)

## Project management

### Start a project


```
xs-dev init my-project
```

Creates a `main.js` and minimally configured `manifest.json` for running in the simulator.

Flags:

- `typescript`: includes typings and creates `main.ts` (experimental)
- `io`: includes [TC53 IO manifest](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/io/io.md)
- `example`: use [Moddable example project](https://github.com/Moddable-OpenSource/moddable/tree/public/examples) as base for new project
- `overwrite`: replace any existing directory of the same name

For the example flag, it can be used as a boolean to select a project from a list:

```
xs-dev init my-project --example
```

Or select from a filtered list of projects:

```
xs-dev init my-project --example http
```

Or if the complete example name is passed, it will be selected by default:

```
xs-dev init my-project --example network/mqtt/mqttbasic
```

### Build and run a project

In the project directory:

```
xs-dev run
```

When not in the project directory:

```
xs-dev run path/to/project
```

Flags:

- `device`: `esp8266` | `esp32` | `pico` | [any of the allowed platform identifiers](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#arguments) (defaults to current OS platform)
- `port`: path to port for connected device (defaults to: `UPLOAD_PORT` environment variable)

### Add a Moddable SDK module

```
xs-dev include network/wifi
```

Or select from available modules:

```
xs-dev include
xs-dev include files
```

Updates the `manifest.json` to include the module. 

Flags:

- `device`: When this flag is present, the module is added to the `platforms` section for the specified device. When `device` is not provided, the module is added to the global manifest section to be used for all devices. For example, the following adds the module for use on `esp32` devices only:

```
xs-dev include files/flash --device esp32
```

### Scan for available devices

If the default device discovery is having trouble finding the correct port when running a project, use this command to find available ports to pass through the `--port` flag:

```
$ xs-dev scan

✔ Found the following available devices!
  Port                         Device                      Features
  /dev/cu.usbserial-0001       ESP8266EX                   WiFi
  /dev/cu.usbserial-DN02N5XK   ESP32-D0WDQ6 (revision 0)   WiFi, BT, Dual Core, Coding Scheme None

$ xs-dev run --port /dev/cu.usbserial-0001 --device esp8266
```


### Add a remote dependency (Coming soon)

```
xs-dev get dtex/j5e
```

Assumes the dependency is a GitHub repo, clones it to `~/.local/share`, creates an environment variable with the name of the repo, and updates the `manifest.json` with the path to that dependency.

To include a specific module for the installed dependency:

```
xs-dev include j5e/lib/led
```

### Remove a Moddable SDK module

```
xs-dev remove network/wifi
```

Updates the `manifest.json` to remove the module.

Or remove all modules that contain a string. This removes all modules that contain `"wifi"`.

```
xs-dev remove wifi
```

Flags:

- `device`: When this flag is present, the module is removed from the `platforms` section for the specified device. When `device` is not provided, the module is removed from the global manifest section. For example, the following adds the module for use on `esp32` devices only:

```
xs-dev remove network/mqtt --device esp32
```

## Development

Clone the project and install dependencies. We're using [pnpm](https://pnpm.io/) and [volta](https://volta.sh/) to manage packages and Node.

```
git clone https://github.com/HipsterBrown/xs-dev.git
cd xs-dev
pnpm install
```

Link dev version of CLI using `pnpm`, which will override any other globally installed version:

```
pnpm link --global
pnpm link --global xs-dev
```

Or create an alias to clearly denote the local version of the CLI:

```
alias local-xs-dev=$PWD/bin/xs-dev
```

To maintain the alias between shell sessions, for example I use zsh:

```
echo "alias local-xs-dev=$PWD/bin/xs-dev" >> ~/.zshrc
```

## Docs

The documentation site is built with [Astro](https://astro.build) and can be found in the `docs/` directory. When working on them locally, run `pnpm start:docs` to start the development server that watches for file changes and reloads the page.
