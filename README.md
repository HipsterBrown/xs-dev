# Setup CLI for [Moddable XS tools](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/Moddable%20SDK%20-%20Getting%20Started.md)

The Moddable SDK and associated dev board tooling is incredibly empowering for embedded JS hardware development, however the set up process can be tedious to follow when getting started. This project aims to streamline the install and environment configuration requirements across platforms in just a few commands.

**Feature support:**

- [X] [Moddable SDK install & setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/Moddable%20SDK%20-%20Getting%20Started.md)
- [X] [ESP32 SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/esp32.md)
- [ ] [ESP8266 SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/esp8266.md)
- [ ] [Gecko SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/gecko/GeckoBuild.md)
- [ ] [QCA4020 SDK setup](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/qca4020/README.md)
- [ ] Update Moddable SDK

**Platform support:**

- [X] Mac
- [ ] Windows
- [ ] Linux

## Usage

Globally install [`zx`](https://github.com/google/zx) before running the script.

Clone this repo and `cd` into the directory:

```
git clone https://github.com/HipsterBrown/xs-setup && cd xs-setup
```

## Features

### Moddable SDK install / setup

This process mostly automates the instructions provided by Moddable's "Getting Started" documentation with a few exceptions:

- it will not install XCode, just ensures the command line tools are available
- the `moddable` git repo is cloned into `~/.local/share` instead of a new/existing `~/Projects` directory
- a symlink for `xsbug.app` is created in `/Applications` for easy access through Launchpad (on Mac)

Run script:

```
./xs-setup.mjs
```

### ESP32 SDK install / setup

This process automates the instructions for downloading and building the esp-idf SDK tooling.

Run script:

```
./xs-setup.mjs --device=esp32
```
