---
title: Troubleshooting
description: Tips for resolving known issues
---

## `symbol not found in flat namespace '_lzma_stream_encoder_mt'`

Other error messages can include: 

- "Unable to extract Arm Embedded Toolchain without XZ utils (https://tukaani.org/xz/). Please install that dependency on your system and reinstall xs-dev before attempting this setup again."

If you encounter an error message related to lzma or node-lzma, this is likely due to a missing system dependency required to setup the tooling to program nrf52-based devices. This is only required on MacOS and Linux development environments.

To resolve this, install the [XZ Utils](https://tukaani.org/xz/) for your system.

On MacOS, [Homebrew](https://brew.sh) can be used:

```
brew install xz
```

For Debian-based systems like Ubuntu:

```
sudo apt-get -y install xz-utils
```

If using `yum`:

```
sudo yum -y install xz
```

Once this is dependency has been installed, please re-install xs-dev to ensure the CLI is built correctly with the native bindings to xz-utils.
