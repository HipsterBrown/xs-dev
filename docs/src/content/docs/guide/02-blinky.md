---
title: Guiding Light
description: Initialize a new project and blink an LED using hardware IO
---

**Initialize a new project and blink an LED using hardware IO**

## Project creation

The [`init` command](/features/init) will create a new directory with the name provided and scaffold the starting files. To include the [ECMA-419](https://419.ecma-international.org/) hardware IO APIs, pass the `--io` flag:

```
xs-dev init --io guiding-light
```

The above command should result in the following output:

```
Generating Moddable project: guiding-light
Run the project using: cd guiding-light && xs-dev run
```

_Note: the scaffolded hint shows `xs-dev run` without a device target. For physical hardware you will always pass `--device <device>` — covered in the next section._

The `guiding-light` directory will contain `main.js` and `package.json` files. The initialized `package.json` should look like this:

```json
{
  "name": "guiding-light",
  "main": "main.js",
  "type": "module",
  "description": "A starter project for embedded JS",
  "scripts": {
    "build": "xs-dev build",
    "start": "xs-dev run"
  },
  "devDependencies": {},
  "moddable": {
    "manifest": {
      "build": {
        "MODULES": "$(MODDABLE)/modules"
      },
      "include": ["$(MODULES)/io/manifest.json"]
    }
  }
}
```

The `moddable.manifest` field tells xs-dev which Moddable SDK modules to pull into the build. In this case it includes the TC53 IO module bundle, which makes `device.io.Digital` and related hardware APIs available to your code. See [Manifest Anatomy](/reference/manifest-anatomy) for a full breakdown of this configuration.

The generated `main.js` starts with a familiar hello world:

```javascript
debugger;

let message = "Hello, world - sample";
console.log(message);
```

The first line is a [debugger statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/debugger) for setting a breakpoint in [xsbug](/reference/xsbug). You will replace this with LED blink code in a moment.

## Down to the metal

At this point, we have our [chosen hardware in hand](/guide/00-prepare#choose-your-hardware-adventure) and need to set up the dev environment to start running code on the device.

Just like the [previous step](/guide/01-hello-console#setup-system-tooling), the `setup` command will automate the installation and building of tooling required for the target device. The `--list-devices` flag will provide an interactive list of supported device platforms:

```
xs-dev setup --list-devices
? Here are the available target devices: …
esp8266
esp32
nrf52
pico
wasm
mac
```

_You may see different options depending on what operating system or version of xs-dev you are using._

If you already know your target device, you can skip the interactive prompt and pass `--device` directly:

```
xs-dev setup --device pico
```

Once this process is done, you should see a success message (where `<device>` is the selected target device):

```
Successfully set up <device> platform support for Moddable!
Test out the setup by starting a new terminal session, plugging in your device, and running: xs-dev run --example helloworld --device=<device>
If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the /dev.cu.* that matches your device.
```

If you are unsure which port your device is connected to, use [`xs-dev scan`](/features/scan) to list connected serial devices and identify the correct port.

Running our project on the selected device (which should be connected to the computer over USB) uses the same command as before with the additional `--device` flag:

```
xs-dev run --device <device>
```

This will take some time to compile and send the code over to the device. When it has succeeded, [xsbug](/reference/xsbug) will open and begin tracing logs from the hardware. See the [Build Tools](/reference/build-tools) reference if you are curious what `xs-dev run` invokes under the hood.

## Hello blinky

Now that we know we can run code on our device, it is time to shed a little light on hardware control. Replace the contents of `main.js` with the following:

```javascript
if (device?.pin?.led === undefined) {
  throw new Error("no LED pin provided by device");
}

const Digital = device.io.Digital;
const led = new Digital({
  pin: device.pin.led,
  mode: Digital.Output,
});
led.write(1);

let state = 0;
System.setInterval(() => {
  led.write(state);
  state ^= 1;
}, 200);
```

<!-- TODO: add info note about how the `state ^= 1` eval works -->

### Digital setup

```javascript
const Digital = device.io.Digital;
const led = new Digital({
  pin: device.pin.led,
  mode: Digital.Output,
});
led.write(1);
```

`device.io.Digital` is the [ECMA-419 Digital IO class](https://embedded.js.org/api/io-class/digital/) provided by the device's IO provider — it is available because the `$(MODULES)/io/manifest.json` entry in your `package.json` pulls in the TC53 IO module bundle.

`device.pin.led` is a built-in pin alias set by the device platform. It resolves to the pin number of the onboard LED so you do not have to look it up in the datasheet. The guard at the top of the file (`if (device?.pin?.led === undefined)`) makes this explicit: if the platform does not define that alias, the program throws a clear error rather than silently doing nothing.

`Digital.Output` sets the direction so the pin drives voltage rather than reading it. With that, calling `led.write(1)` sends power to the LED and turns it on.

### Blink loop

```javascript
let state = 0;
System.setInterval(() => {
  led.write(state);
  state ^= 1;
}, 200);
```

The global [`System` class](https://github.com/Moddable-OpenSource/moddable/blob/public/modules/io/system/system.js) provides the well-known [`setInterval`](https://developer.mozilla.org/en-US/docs/Web/API/setInterval) function familiar from browser and Node.js environments. Every 200 milliseconds, the current `state` is written to the LED, then toggled using the XOR assignment (`state ^= 1`), which flips between `0` and `1` each tick.

Run the project with:

```
xs-dev run --device <device>
```

If it succeeds, you should see a blinking LED somewhere on your device! ✨

👏 Give yourself a round of applause! You are now controlling hardware with JavaScript!

## Keep exploring!

Try adding `console.log` calls to log the state to the [xsbug](/reference/xsbug) console, or update the timer interval to send a message in [Morse code](https://ledask.com/morse-code-lights/).

Ready to add more interactivity? Continue to learn about [Button Input](/guide/03-button).

In the meantime, check out the [many examples available in the Moddable SDK](https://github.com/Moddable-OpenSource/moddable/tree/public/examples).

## Troubleshooting

**`device.pin.led` is undefined**

Not every device defines a built-in LED pin alias. If the guard at the top throws, your platform does not provide `device.pin.led`. You can supply the pin number directly instead:

```javascript
const led = new Digital({
  pin: 25, // Pico onboard LED
  mode: Digital.Output,
});
```

Check your board's pinout diagram to find the correct number — for example, [pico.pinout.xyz](https://pico.pinout.xyz/) for the Raspberry Pi Pico.

**Connecting an external LED**

If your device has no onboard LED, connect one to a GPIO pin on a breadboard:

- Connect the LED anode (longer leg) to the GPIO pin.
- Connect the LED cathode (shorter leg) to GND through a current-limiting resistor (220 Ohm to 330 Ohm is typical for 3.3 V systems).

Then set `pin` in the `Digital` constructor to the GPIO pin number from your board's pinout diagram.
