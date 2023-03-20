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

## Troubleshooting

When attempting to run the Hello World example, if you continually see the following error (even after starting a new terminal session):

```
Moddable tooling required. Run 'xs-dev setup --device <computer os here>' before trying again.
```

There may be an issue with the terminal shell or command prompt using the correct [environment configuration](/xs-dev/en/features/setup#overview) for xs-dev.

- [Learn about Terminal profiles on MacOS](https://support.apple.com/guide/terminal/default-startup-terminal-window-profiles-trml5856b1f2/mac)
- [Learn about shell initialization files and user profiles on Linux](https://www.tecmint.com/understanding-shell-initialization-files-and-user-profiles-linux/)
- [Learn about Windows Terminal startup settings](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/startup)

On "Unix-like" environments (MacOS, Linux), the `env` command should contain a reference to the `MODDABLE` environment variable:

```
env | grep MODDABLE
```
The above command should return something like `MODDABLE=/Users/<username>/.local/share/moddable` to indicate where the Moddable SDK has been installed in the filesystem.
