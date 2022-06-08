---
title: Include
description: Manage modules from Moddable SDK
layout: ../../../layouts/MainLayout.astro
---

# Manage modules from Moddable

The Moddable SdK ships with many first-party modules to support various features, peripherals, sensors, etc. The `include` command will update the project `manifest.json` with the selected module:

```
xs-dev include network/wifi
```

Or select from available modules:

```
xs-dev include
xs-dev include files
```

## Select a device

When the `--device` flag is present, the module is added to the `platforms` section of the `manifest.json` for the specified device. When `device` is not provided, the module is added to the global manifest section to be used for all devices. For example, the following adds the module for use on `esp32` devices only:

```
xs-dev include files/flash --device esp32
```

## Remove a module

Updates the `manifest.json` to remove the module.

```
xs-dev remove network/wifi
```

Or remove all modules that contain a string. This removes all modules that contain `"wifi"`.

```
xs-dev remove wifi
```

The `--device` flag works for the `remove` command as well:

```
xs-dev remove network/mqtt --device esp32
```
