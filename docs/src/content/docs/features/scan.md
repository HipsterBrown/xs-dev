---
title: Scan
description: Discover connected device targets
---

# Discovery available devices

This command will use the [`esptool.py`](https://github.com/espressif/esptool) and/or [`picotool`](https://github.com/raspberrypi/picotool) command line tools to find available device targets connected over USB to the local dev environment.

```
xs-dev scan
```

This will provide info with the port address, device name, and discovered features:

```
✔ Found the following available devices!
  Port                         Device                      Features
  /dev/cu.usbserial-0001       ESP8266EX                   WiFi
  /dev/cu.usbserial-DN02N5XK   ESP32-D0WDQ6 (revision 0)   WiFi, BT, Dual Core, Coding Scheme None
```

The port can be used with the [`run`](./run) command to specify a device, if multiple are connected:

```
xs-dev run --port /dev/cu.usbserial-0001 --device esp8266
```
