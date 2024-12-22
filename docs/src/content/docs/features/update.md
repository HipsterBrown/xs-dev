---
title: Update
description: Stay up to date with the latest tooling
---

# SDK & Tooling Updates

Stay up to date with the latest tooling from Moddable and supported device targets. As with the [`setup`](/features/setup) command, the current dev environment (Mac or Linux) is the default selected target:

```
xs-dev update
```

## Tagged Release

The default behavior of this command for Moddable developer tooling pulls the [latest release tooling](https://github.com/Moddable-OpenSource/moddable/releases) and source code for the associated tagged branch. This provides a known-working state for the SDK and avoids needing to build the tooling on the local machine. 

To override this behavior, use the `--release` flag to select a tagged release version; this fetches the pre-compiled release assets and latest commit off that tag.

```
xs-dev update --release 5.3.0
```

_This will only work for the `mac`, `windows`, and `linux` device options, which are the respective defaults for the operating system on which the command is run._

## Target Branch

The default behavior of this command for Moddable developer tooling pulls the [latest release tooling](https://github.com/Moddable-OpenSource/moddable/releases) and source code for the associated tagged branch. This provides a known-working state for the SDK and avoids needing to build the tooling on the local machine. 

To override this behavior, use the `--branch` flag to select `public`; this fetches the latest commit off that main branch and runs the build to generate the associated tools.

```
xs-dev update --branch public
```

_This will only work for the `mac`, `windows`, and `linux` device options, which are the respective defaults for the operating system on which the command is run._

## Device Updates

While the `update` command provides the latest Moddable SDK for the dev environment, the `--device` flag selects another platform target SDK to set up. It ensures the Moddable SDK has been installed first.

The `--device` flag allows for selecting a different target platform:

```
xs-dev update --device esp32
```

_There may be some platforms that are supported by the `setup` command but not `update` yet._
