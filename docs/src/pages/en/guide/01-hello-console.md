---
title: Hello Console
description: How to set up the basic development environment and run your first program
layout: ../../../layouts/MainLayout.astro
---

**How to set up the basic development environment and run your first program**

## Install the CLI

`xs-dev` can be installed globally using the [NodeJS package manager of your choice](./00-prepare#nodejs-package-manager-optional).

```
npm install -g xs-dev
```

```
pnpm install -g xs-dev
```

```
yarn global add xs-dev
```

## Setup system tooling

As specified in the [setup documentation](../features/setup), the [Moddable SDK and associated tooling](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md) is installed using the following command:

```
xs-dev setup
```

This will determine the correct tooling to install based on your operating system.

**[Windows support coming soon](https://github.com/HipsterBrown/xs-dev/pull/53)**

Once this process is done, you should see a success message:

```
Moddable SDK successfully set up! Start a new terminal session and run the "helloworld example": xs-dev run --example helloworld
```

## Run the Hello World example

To start a new terminal session, you can either execute your shell of choice (`bash`/`zsh`/`fish`) or create a new terminal window / tab. This will ensure the expected tooling is available in your session [PATH](https://en.wikipedia.org/wiki/PATH_(variable)).

You can [run any Moddable example included in the SDK](../features/run#moddable-examples). The "Hello World" example provides the simplest program to get started and can be run in the [simulator](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/tools.md#simulator):

```
xs-dev run --example helloworld
```

This will start up the debugger and simulator:

![Moddable simulator app and debugger app running on MacOS](/xs-dev/run-hello-world.png)

This will keep running until the `Ctrl+C` keys are entered in the terminal session or both apps are quit.

## Keep exploring!

Use the `--list-examples` flag with the `run` command to search the extensive list of available examples to run in the simulator: `xs-dev run --list-examples`

