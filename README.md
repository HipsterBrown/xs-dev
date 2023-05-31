# CLI for automating the setup and usage of [Moddable XS tools](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/Moddable%20SDK%20-%20Getting%20Started.md)

The Moddable SDK and associated dev board tooling is incredibly empowering for embedded JS hardware development, however the set up process can be tedious to follow when getting started. This project aims to streamline the install and environment configuration requirements across platforms in just a few commands.

[Check out the documentation!](https://hipsterbrown.github.io/xs-dev/)

**This project is a work in progress and currently pre-1.0, so there may be breaking changes.**

## Requirements

[Node.js >= v16](https://nodejs.org/en/)

_If you've never installed Node.js before, check out the [getting started guide for xs-dev](https://hipsterbrown.github.io/xs-dev/en/guide/00-prepare#nodejs-package-manager-optional)._

**On Linux:**

Setup commands rely on [`ssh-askpass`](https://packages.ubuntu.com/bionic/ssh-askpass) to prompt for permission when installing other tools and dependencies.

## Install

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

## Features & Usage

Check out the [docs](https://hipsterbrown.github.io/xs-dev/) to learn about using xs-dev and getting started with embedded JS development.

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

## Docs

The documentation site is built with [Astro](https://astro.build) and can be found in the `docs/` directory. When working on them locally, run `pnpm start:docs` to start the development server that watches for file changes and reloads the page.
