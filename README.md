# CLI for automating the setup and usage of [Moddable XS tools](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/Moddable%20SDK%20-%20Getting%20Started.md)

The Moddable SDK and associated dev board tooling is incredibly empowering for embedded JS hardware development, however the set up process can be tedious to follow when getting started. This project aims to streamline the install and environment configuration requirements across platforms in just a few commands.

**This project is a work in progress and should be considered pre-1.0.**

**Feature support:**

- [X] [Moddable SDK install & setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/Moddable%20SDK%20-%20Getting%20Started.md)
- [X] [ESP32 SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/esp32.md)
- [X] [ESP8266 SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/esp8266.md)
- [ ] [Gecko SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/gecko/GeckoBuild.md)
- [ ] [QCA4020 SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/qca4020/README.md)
- [X] Update Moddable SDK
- [X] Project management, including dependencies
- [X] WASM simulator
- [ ] Raspberry Pi Pico

**Platform support:**

- [X] Mac
- [ ] Windows
- [ ] Linux

## Requirements

[Node.js >= v12](https://nodejs.org/en/)

## Install

```
npm install -g xs-dev
```

## Features

### Moddable SDK setup / update / teardown

This process mostly automates the instructions provided by Moddable's "Getting Started" documentation with a few exceptions:

- it will not install XCode, just ensures the command line tools are available
- the `moddable` git repo is cloned into `~/.local/share` instead of a new/existing `~/Projects` directory
- a symlink for `xsbug.app` is created in `/Applications` for easy access through Launchpad (on Mac)

**On Linux, `xs-dev setup` commands should be prefixed with `sudo -E` to provide the user permission to install dependencies in the current shell environment.**

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

- `device`: `esp8266` | `esp32` | [any of the allowed platform identifiers](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#arguments) (defaults to current OS platform)
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

- `device`: `esp8266` | `esp32` | [any of the allowed platform identifiers](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#arguments) (defaults to current OS platform)
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

Run an example (coming soon):
```
xs-dev run --example helloworld
```

Flags:

- `device`: `esp8266` | `esp32` | [any of the allowed platform identifiers](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#arguments) (defaults to current OS platform)
- `port`: path to port for connected device (defaults to: `UPLOAD_PORT` environment variable)

## Project management

### Start a project


```
xs-dev init my-project
```

Creates a `main.js` and base configured `manifest.json` for running in the simulator.

Flags:

- `typescript`: includes typings and creates `main.ts` (experimental)
- `io`: includes [TC53 IO manifest](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/io/io.md)

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

- `device`: `esp8266` | `esp32` | [any of the allowed platform identifiers](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#arguments) (defaults to current OS platform)
- `port`: path to port for connected device (defaults to: `UPLOAD_PORT` environment variable)

### Add a Moddable module

```
xs-dev include network/wifi
```

Or select from available modules:

```
xs-dev include
```

Updates the `manifest.json` with the path to the dependency.

### Add a remote dependency (Coming soon)

```
xs-dev get dtex/j5e
```

Assumes the dependency is a GitHub repo, clones it to `~/.local/share`, creates an environment variable with the name of the repo, and updates the `manifest.json` with the path to that dependency.

To include a specific module for the installed dependency:

```
xs-dev include j5e/lib/led
```

### Remove a dependency

```
xs-dev remove network/wifi
```

Updates the `manifest.json` to remove the dependency.

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
