---
title: Introduction
description: xs-dev intro
layout: ../../layouts/MainLayout.astro
---

# **Welcome to xs-dev!**

CLI for automating the setup and usage of [Moddable XS tools](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/Moddable%20SDK%20-%20Getting%20Started.md)

The Moddable SDK and associated dev board tooling is incredibly empowering for embedded JS hardware development, however the set up process can be tedious to follow when getting started. This project aims to streamline the install and environment configuration requirements across platforms in just a few commands.

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

## Getting Started

```
npm install -g xs-dev
```

```
pnpm install -g xs-dev
```

```
yarn add -g xs-dev
```
