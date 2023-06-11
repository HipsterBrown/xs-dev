---
title: Guiding Light
description: Initialize a new project and start to interact with some hardware!
---

**Initialize a new project and start to interact with some hardware!**

## Project creation

The [`init` command](/en/features/init) will create a new directory with the name provided and saffold the starting files based on a template or example:

```
xs-dev init guiding-light
```

The above command should result in the following output:

```
Generating Moddable project: guiding-light
Run the project using: cd guiding-light && xs-dev run
```

The `guiding-light` directory should contain `main.js` and `manifest.json` files. `main.js` contains that was run from the [Hello Console example](/en/guide/02-hello-console):

```javascript
debugger;

let message = "Hello, world - sample";
trace(message);
```

The first line is a [debugger statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/debugger) for setting a breakpoint in [xsbug](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/xs/xsbug.md).
The third and fourth lines save a string to a variable and log it to the xsbug console using the global [`trace` function](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/xs/xsbug.md#colorizing-consolelog-with-trace).

The [Moddable docs](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/manifest.md) describe the `manifest.json` as follows:

> A manifest is a JSON file that describes the modules and resources necessary to build a Moddable app.

The initialized `manifest.json` in the `guiding-light` project should look like this:

```json
{
  "include": [
    "$(MODDABLE)/examples/manifest_base.json"
  ],
  "modules": {
    "*": "./main"
  }
}
```

The [`include` field](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/manifest.md#include) contains references to other manifests to provide quick reuse of common configuration found in the Moddable SDK, examples, and your own projects. The `manifest_base.json` includes basic platform support for all available platforms and some initial modules for time, timers, and instrumentation.

The [`modules` field](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/tools/manifest.md#modules) should contain a mapping of every module to include in the build. The `*` key means the module (or list of modules) can be imported and referenced by their file name. A custom key can be used as an alias to reference when importing the assigned module.

Executing `xs-dev run` should provide the same experience as the [Hello Console guide](/en/guide/01-hello-console).

_Quick tip: check out all the available simulators by using the [`--list-devices` flag](/en/features/run#select-a-device-target) with the `run` command and typing "simulator" to filter the list._

## Down to the metal

At this point, we have our [chosen hardware in hand](/en/guide/00-prepare#choose-your-hardware-adventure) and need to set up the dev environment to start running code on the device. 

Just like the [previous step](/en/guide/01-hello-console#setup-system-tooling), the `setup` command will automate the installation and building of tooling required for the target device. The `--list-devices` flag will provide an interactive list of supported device platforms:

```
❯ xs-dev setup --list-devices
? Here are the available target devices: …
esp8266
esp32
pico
wasm
mac
```

_You may see different options depending on what operating system or version of xs-dev you are using._

Once this process is done, you should see a success message (where `<device>` is the selected target device):

```
Successfully set up <device> platform support for Moddable!
Test out the setup by starting a new terminal session, plugging in your device, and running: xs-dev run --example helloworld --device=<device>
If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the /dev.cu.* that matches your device.
```

Running our project on the selected device (which should be connected to the computer somehow, presumable over USB) is the same command as before with the additional `--device` flag to pass in the target device platform:

```
xs-dev run --device <device>
```

This will take some time to compile and send the code over to the device. When it has succeeded, the debugger will open like before but now it is tracing the logs coming from the hardware!

👏 Give yourself a round of applause! You have now run JavaScript on an embedded device! 🎉

## Hello blinky

Now that we know we can run code on our device, it is time to shed a little light on hardware control. We will use the [ECMA-419 standard APIs](https://419.ecma-international.org/) to perform this task. To access those APIs we need to include them in our project:

```
xs-dev include io
```

The [`include` command](/en/features/include) updates the `manifest.json` to (you guessed it) _include_ the required module(s) from the Moddable SDK. In this case, the `io` module provides the complete set of ECMA-419 APIs for the supported device platform. The `manifest.json` should look like this:

```json
{
  "include": [
    "$(MODDABLE)/examples/manifest_base.json",
    "$(MODDABLE)/modules/io/manifest.json"
  ],
  "modules": {
    "*": "./main"
  }
}
```

With that configured, the `main.js` file can be updated with the following code:

```javascript
const Digital = device.io.Digital;
const led = new Digital({
   pin: device.pin.led,
   mode: Digital.Output,
});
led.write(1);

let state = 0;
System.setInterval(() => {
	led.write(state);
	if (state === 0) {
        state = 1;
    } else {
        state = 0;
    }
}, 200);
```

Using the [global `device` variable](https://419.ecma-international.org/#-16-host-provider-instance-global-variable) provided by the `io` module, we can access the [`Digital` IO class](https://419.ecma-international.org/#-10-io-classes-digital) for controlling the digital output to an LED. In this example, the `Digital` class is instantiated with the `pin` property set to the built-in led as [defined on the global `device`](https://419.ecma-international.org/#-16-host-provider-instance-pin-name-property) and the `mode` set to the [`Digital.Output`](https://419.ecma-international.org/#-10-io-classes-digital) static property found on the class. With that Digital instance variable called `led`, the [`write` method](https://419.ecma-international.org/#-9-io-class-pattern-write-method) is called with a value of `1` to send power to the LED.

```javascript
const Digital = device.io.Digital;
const led = new Digital({
   pin: device.pin.led,
   mode: Digital.Output,
});
led.write(1);
```

To make the light blink, the next value to be written is stored as the `state` variable. The global [`System` class](https://github.com/Moddable-OpenSource/moddable/blob/public/modules/io/system/system.js) provides the well-known [`setInterval`](https://developer.mozilla.org/en-US/docs/Web/API/setInterval) function that is found in other JavaScript runtimes like the Web and Node.js. Every 200 milliseconds, the `state` is written to the LED before being updated to the opposite value.

```javascript
let state = 0;
System.setInterval(() => {
	led.write(state);
	if (state === 0) {
        state = 1;
    } else {
        state = 0;
    }
}, 200);
```

The project can be run using the same command as before: `xs-dev run --device <device>`. If it succeeds, you should see a blinking LED somewhere on your device! ✨

## Keep exploring!

Tried adding some `trace` calls to log the state to the debugger or updating the timer code to send a message in [Morse code](https://ledask.com/morse-code-lights/).

_Coming soon: react to digital input by pressing some buttons_

## Troubleshooting

If you're working with a device that doesn't have an on-board LED or encounter an error while trying to use the `device.pin.led` value, the [pin specifier](https://419.ecma-international.org/#-9-io-class-pattern-pin-specifier) can be set to a custom value based on the device datasheet or pinout diagram, like [this one for the Pico](https://pico.pinout.xyz/). The pin value can match the on-board LED or [an external LED](https://www.sparkfun.com/products/12062) connected to a GPIO, most likely by using a [breadboard](https://learn.sparkfun.com/tutorials/how-to-use-a-breadboard#building-your-first-breadboard-circuit).
