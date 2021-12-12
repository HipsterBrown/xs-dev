# CLI for automating the setup and usage of [Moddable XS tools](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/Moddable%20SDK%20-%20Getting%20Started.md)

The Moddable SDK and associated dev board tooling is incredibly empowering for embedded JS hardware development, however the set up process can be tedious to follow when getting started. This project aims to streamline the install and environment configuration requirements across platforms in just a few commands.

**Feature support:**

- [X] [Moddable SDK install & setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/Moddable%20SDK%20-%20Getting%20Started.md)
- [X] [ESP32 SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/esp32.md)
- [X] [ESP8266 SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/esp8266.md)
- [ ] [Gecko SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/gecko/GeckoBuild.md)
- [ ] [QCA4020 SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/qca4020/README.md)
- [X] Update Moddable SDK
- [ ] Project management, including dependencies

**Platform support:**

- [X] Mac
- [ ] Windows
- [ ] Linux

## Usage

Globally install [`zx`](https://github.com/google/zx) before running the script.

Clone this repo and `cd` into the directory:

```
git clone https://github.com/HipsterBrown/xs-setup && cd xs-dev
```

## Features

### Moddable SDK install / setup / update

This process mostly automates the instructions provided by Moddable's "Getting Started" documentation with a few exceptions:

- it will not install XCode, just ensures the command line tools are available
- the `moddable` git repo is cloned into `~/.local/share` instead of a new/existing `~/Projects` directory
- a symlink for `xsbug.app` is created in `/Applications` for easy access through Launchpad (on Mac)

Run script for initial setup:

```
./xs-dev.mjs setup
```

Run script for updating SDK:

```
./xs-dev.mjs update
```

### ESP32 SDK install / setup

This process automates the instructions for downloading and building the esp-idf SDK tooling.

Run script for platform setup:

```
./xs-dev.mjs setup --device=esp32
```

Run script to confirm the setup:

```
./xs-dev.mjs test --device=esp32
```

### ESP8266 SDK install / setup

This process automates the instructions for downloading all the dependencies for the ESP8266 RTOS SDK.

Run script for platform setup:

```
./xs-dev.mjs setup --device=esp8266
```

Run script to confirm the setup:

```
./xs-dev.mjs test --device=esp8266
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
./xs-dev.mjs run-example --list
```

Run an example:
```
./xs-dev.mjs run-example helloworld
```

Flags:

- `device`: `esp8266` | `esp32` | `mac` (defaults to `mac`)
- `port`: path to port for connected device (defaults to: `/dev/cu.SLAB_USBtoUART`)

## Project management (Coming soon)

### Start a project


```
./xs-dev.mjs init my-project
```

Creates a `main.js` and base configured `manifest.json` for running in the simulator.

Flags:

- `device`: `esp8266` | `esp23` (set the default platform for the project)

### Build and run a project

```
./xs-dev.mjs run path/to/project
```

Flags:

- `device`: `esp8266` | `esp32` | `mac` (defaults to `mac`)
- `port`: path to port for connected device (defaults to: `/dev/cu.SLAB_USBtoUART`)

### Add a core dependency

```
./xs-dev.mjs include moddable/network/wifi
```

Updates the `manifest.json` with the path to the dependency.

### Add a remote dependency

```
./xs-dev.mjs get dtex/j5e
```

Assumes the dependency is a GitHub repo, clones it to `~/.local/share`, creates an environment variable with the name of the repo, and updates the `manifest.json` with the path to that dependency.

To include a specific module for the installed dependency:

```
./xs-dev.mjs include j5e/lib/led
```

### Remove a dependency

```
./xs-dev.mjs remove moddable/network/wifi
```

Updates the `manifest.json` to remove the dependency.
