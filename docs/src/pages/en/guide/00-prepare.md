---
title: Prerequisites
description: Prepare for embedded JS development
layout: ../../../layouts/MainLayout.astro
---

**Prepare for embedded JS development**

Getting started on the journey to developing embedded hardware projects with JavaScript assumes some knowledge of various technologies like the command line, text editors, package managers, and [the JavaScript programming language](https://developer.mozilla.org/en-US/docs/Web/javascript).

## Command Line

Tutorial content will reference command line utilities and jargon as part of the workflow for developing embedded JS projects. Select your operating system to learn more about this subject:

- [MacOS OR Linux](https://www.freecodecamp.org/news/command-line-for-beginners/)
- [Windows](https://www.freecodecamp.org/news/command-line-commands-cli-tutorial/)

Inline terminal commands will usually be formatting like the following: `echo "hello world"`

Code examples will look like the following:

```javascript
trace('hello world')
```

## Text Editors

A local plain text editor is generally required for creating and editing your JavaScript projects. You can download one of the following free applications with either built-in or third-party support for JavaScript:

- [Visual Studio Code](https://code.visualstudio.com/)
- [Neovim](http://www.sublimetext.com/) / [Vim](https://www.vim.org/)
- [Sublime Text](http://www.sublimetext.com/)

These are not the only available editors, so feel free to do your own research and pick what feels right to you!

## NodeJS & Package Manager (optional)

While [NodeJS](https://nodejs.org/en/) is not required for [Moddable XS](https://github.com/Moddable-OpenSource/moddable) projects, it is a dependency for installing and using the [`xs-dev` CLI](https://hipsterbrown.github.io/xs-dev/en/introduction/).

Node can be [downloaded directly from the website](https://nodejs.org/en/download/), however using one of the following version managers can help with quickly switching to recommended versions of the tooling in the future:

- [Volta](https://volta.sh/)
- [fnm](https://github.com/Schniz/fnm)
- [asdf](https://asdf-vm.com/guide/getting-started.html#_4-install-a-plugin)
- [rtx](https://github.com/jdxcode/rtx#installation)
- [`pnpm env`](https://pnpm.io/cli/env)

Node comes with [npm](https://docs.npmjs.com/cli/v8/commands/npm) as the included package manager, but there are other options available if needed:

- [pnpm](https://pnpm.io/installation)
- [yarn](https://yarnpkg.com/)

### Troubleshooting

If you encounter an `EACCES` error after setting up NodeJS and attempt to install a package, like the following:

```
Error: EACCES: permission denied, mkdir
```

Check out the [npm docs](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally) to learn about to resolve it: https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally

## Linux Permissions

Setup commands rely on [`ssh-askpass`](https://packages.ubuntu.com/bionic/ssh-askpass) to prompt for permission when installing other tools and dependencies.

## Choose your hardware adventure

Hardware is not required to get started with xs-dev, or even to run some code, since there are [simulated devices available with the Moddable SDK](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#simulator).

Simulators are fun and everything, but controlling hardware with JavaScript is even better! `xs-dev` supports a few popular hardware platforms through [Moddable](https://github.com/Moddable-OpenSource/moddable):

- [ESP8266](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/esp8266.md)
- [ESP32](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/esp32.md)
- [Raspberry Pi Pico](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/devices/pico.md)

Each platform has a variety of features and form factors to support whatever you might dream up. This guide will do its best to provide code and diagrams that match the expectations of your chosen device(s) but cannot promise comprehensive coverage of every piece of hardware in existence.

If you run into issues or have a question, please [start a discussion in the GitHub repo](https://github.com/HipsterBrown/xs-dev/discussions).

Once you feel ready, [move on the first step of installing the CLI and the Moddable SDK](/en/guide/01-hello-console).
