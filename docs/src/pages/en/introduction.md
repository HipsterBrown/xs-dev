---
title: Introduction
description: xs-dev intro
layout: ../../layouts/MainLayout.astro
---

# **Welcome to xs-dev!**

CLI for automating the setup and usage of [Moddable XS tools](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/Moddable%20SDK%20-%20Getting%20Started.md)

The Moddable SDK and associated dev board tooling is incredibly empowering for embedded JS hardware development, however the set up process can be tedious to follow when getting started. This project aims to streamline the installation and environment configuration requirements across platforms in just a few commands.

**This project is a work in progress and should be considered pre-1.0.**

**Features:**

- [X] [Moddable SDK setup](./features/setup)
- [X] [SDK updates](./features/update)
- [X] [Teardown](./features/teardown)
- [X] [Device discovery](./features/scan)
- [X] [Project creation](./features/init)
- [X] [Run a project or example](./features/run)
- [X] [SDK module management](./features/include)
- [ ] Third-party dependency management ([coming soon](https://github.com/HipsterBrown/xs-dev/issues/49))

**Platform support:**

- [X] Mac
- [ ] Windows ([coming soon](https://github.com/HipsterBrown/xs-dev/pull/44))
- [X] Linux

## Requirements

[Node.js >= v12](https://nodejs.org/en/)

**On Linux:**

Setup commands rely on [`ssh-askpass`](https://packages.ubuntu.com/bionic/ssh-askpass) to prompt for permission when installing other tools and dependencies.

## Installation

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
