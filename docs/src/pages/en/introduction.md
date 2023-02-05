---
title: Introduction
description: xs-dev intro
layout: ../../layouts/MainLayout.astro
---

# **Welcome to xs-dev!**

CLI for automating the setup and usage of [Moddable XS tools](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/Moddable%20SDK%20-%20Getting%20Started.md)

The Moddable SDK and associated dev board tooling is incredibly empowering for embedded JS hardware development, however the set up process can be tedious to follow when getting started. This project aims to streamline the installation and environment configuration requirements across platforms in just a few commands.

**This project is a work in progress and currently pre-1.0, so there may be breaking changes.**

**Features:**

- [X] [Moddable SDK setup](./features/setup)
- [X] [SDK updates](./features/update)
- [X] [Teardown](./features/teardown)
- [X] [Device discovery](./features/scan)
- [X] [Project creation](./features/init)
- [X] [Run a project or example](./features/run)
- [X] [SDK module management](./features/include)
- [X] [Get dev environment info](./features/doctor)
- [ ] Third-party dependency management ([coming soon](https://github.com/HipsterBrown/xs-dev/issues/49))

**Platform support:**

- [X] Mac
- [-] Windows (currently in beta)
- [X] Linux

## Requirements

[Node.js >= v14](https://nodejs.org/en/)

_If you've never installed Node.js before, check out the [getting started guide for xs-dev](/xs-dev/en/guide/00-prepare#nodejs-package-manager-optional)._

**On Linux:**

Setup commands rely on [`ssh-askpass`](https://packages.ubuntu.com/bionic/ssh-askpass) to prompt for permission when installing other tools and dependencies.

## Installation

Install the package globally from `npm`:

```
npm install -g xs-dev
```

```
pnpm install -g xs-dev
```

```
yarn global add xs-dev
```

## Update to latest release

```
npm update -g xs-dev
```

```
pnpm update -g xs-dev
```

```
yarn global upgrade xs-dev
```
