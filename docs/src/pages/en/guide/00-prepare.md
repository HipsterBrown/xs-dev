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

## NodeJS Package Manager (optional)

While [NodeJS](https://nodejs.org/en/) is not required for [Moddable XS](https://github.com/Moddable-OpenSource/moddable) projects, it is a dependency for installing and using the [`xs-dev` CLI](https://hipsterbrown.github.io/xs-dev/en/introduction/).

Node can be [downloaded directly from the website](https://nodejs.org/en/download/), however using one of the following version managers can help with quickly switching to recommended versions of the tooling in the future:

- [Volta](https://volta.sh/)
- [fnm](https://github.com/Schniz/fnm)
- [asdf](https://asdf-vm.com/guide/getting-started.html#_4-install-a-plugin)
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
