---
title: Analog Input and PWM Output
description: Read a potentiometer and use the value to control LED brightness with ECMA-419
---

**Read a potentiometer and use the value to control LED brightness with ECMA-419**

This guide builds a complete input-to-output feedback loop: turn a knob, watch the LED brighten or dim. Along the way you will learn how to read an analog voltage, interpret the raw integer the ADC returns, and scale it to drive a PWM output.

## Project setup

Create a new project with the `--io` flag to include the ECMA-419 hardware IO APIs:

```
xs-dev init --io pot-led
```

If you are new to the project layout and `package.json` manifest this generates, see the [LED blink guide](/guide/02-blinky) for a full walkthrough. Once the project is ready, run it on your connected device with:

```
xs-dev run --device <device>
```

## Wiring

<!-- TODO: create Fritzing diagram to embed in this guide -->

You will need a potentiometer, an LED, and a current-limiting resistor (220 Ohm is a good starting point for 3.3 V systems).

**Potentiometer:**

- Connect one outer leg to 3.3 V.
- Connect the other outer leg to GND.
- Connect the center wiper leg to an ADC-capable GPIO pin on your board.

Not every GPIO pin supports analog input — only a subset of pins are wired to the ADC inside the microcontroller. Check your board's pinout diagram to identify which pins are ADC-capable. For the Raspberry Pi Pico, [pico.pinout.xyz](https://pico.pinout.xyz/) is a convenient reference: look for pins labeled `ADC0`, `ADC1`, or `ADC2` (GPIO 26, 27, and 28).

**LED:**

If your device has an onboard LED you can use that for PWM output and skip the external wiring entirely. Otherwise, connect an external LED:

- Connect the anode (longer leg) to a PWM-capable GPIO pin.
- Connect the cathode (shorter leg) through a 220 Ohm resistor to GND.

As with ADC, not all GPIO pins support PWM output. Consult your board's datasheet or pinout diagram to find a suitable pin.

## Reading analog input

Replace the contents of `main.js` with the following to read the potentiometer:

```javascript
const pot = new device.io.Analog({
  pin: 26   // change to your board's ADC-capable pin
});

const rawValue = pot.read();
console.log(`raw: ${rawValue}`);
```

`device.io.Analog` is the [ECMA-419 Analog IO class](https://embedded.js.org/api/io-class/analog/). Calling `pot.read()` returns a raw integer representing the voltage measured on that pin. The integer range depends on the bit-depth of the ADC built into your microcontroller.

### Understanding resolution

`pot.resolution` gives you the bit-depth of the ADC — for example, `12` on the ESP32 and Pico, or `10` on the ESP8266. This is the number of bits used to represent the measurement, not the maximum value itself.

To get the maximum raw value the ADC can return:

```javascript
const maxRead = (1 << pot.resolution) - 1;
```

The `<<` operator shifts the value `1` left by `pot.resolution` bit positions, which is the same as `Math.pow(2, pot.resolution)`. Subtracting `1` gives the largest integer that fits in that many bits. For a 12-bit ADC: `(1 << 12) - 1 = 4095`. For a 10-bit ADC: `(1 << 10) - 1 = 1023`.

With `maxRead` in hand you can normalize the raw reading to a `0.0`–`1.0` range:

```javascript
const normalized = rawValue / maxRead;  // 0.0 when pot is at minimum, 1.0 at maximum
```

## PWM output

[Pulse-width modulation](https://en.wikipedia.org/wiki/Pulse-width_modulation) (PWM) controls the apparent brightness of an LED by switching it on and off very rapidly. The fraction of each cycle during which the pin is high — the duty cycle — determines how bright the LED appears. A duty cycle of 0 means always off; at the maximum value the LED is fully on.

```javascript
const led = new device.io.PWM({
  pin: device.pin.led   // or a specific pin number
});

const maxWrite = (1 << led.resolution) - 1;
led.write(maxWrite);   // full brightness
```

`led.resolution` is the bit-depth of the PWM timer — typically 8–12 bits depending on the platform. The same bit-shift formula applies to get the maximum value to pass to `led.write()`.

## The feedback loop

Now combine both sides. The strategy is straightforward: read the potentiometer, scale the raw value from the ADC range into the PWM range, write the result to the LED.

Replace `main.js` with:
<!-- TODO: use `System.setInterval` instead of `Timer.repeat` -->

```javascript
import Timer from "timer";

const pot = new device.io.Analog({
  pin: 26   // change to your board's ADC-capable pin
});

const led = new device.io.PWM({
  pin: device.pin.led   // or a specific pin number
});

const maxRead = (1 << pot.resolution) - 1;
const maxWrite = (1 << led.resolution) - 1;

Timer.repeat(() => {
  const raw = pot.read();
  const brightness = Math.round((raw / maxRead) * maxWrite);
  led.write(brightness);
}, 20);
```

The scaling expression `(raw / maxRead) * maxWrite` maps the ADC reading proportionally onto the PWM range. `Math.round` ensures the result is an integer, which is what `led.write` expects.

### Why 20 ms?

`Timer.repeat` calls the callback on a fixed interval. 20 milliseconds gives a polling rate of roughly 50 times per second (50 Hz), which is fast enough to make the LED response feel immediate as you turn the knob, without burning unnecessary CPU cycles. Analog sensors like potentiometers do not generate interrupts the way a button does — polling is the right model here.

## Run it

Build and flash the project:

```
xs-dev run --device <device>
```

Once the code is running, slowly rotate the potentiometer. The LED should dim and brighten smoothly as you turn the knob. Turning to one extreme should bring the LED close to off; turning to the other should bring it to full brightness.

## Keep exploring!

Add a `console.log` call inside the `Timer.repeat` callback to watch the raw and scaled values scroll past in xsbug:

```javascript
Timer.repeat(() => {
  const raw = pot.read();
  const brightness = Math.round((raw / maxRead) * maxWrite);
  console.log(`raw: ${raw}  brightness: ${brightness}`);
  led.write(brightness);
}, 20);
```

This is a useful debugging technique any time you are working with sensor data — seeing the numbers makes it much easier to understand what the hardware is doing.

Ready to talk to external sensors over a bus protocol? Continue to [I2C Sensor](/guide/05-i2c-sensor).

## Troubleshooting

**LED is always at full brightness or always off**

Check that the pin you are using supports PWM output. Not every GPIO pin on a microcontroller is connected to a PWM-capable timer. Consult your board's pinout diagram and choose a pin that is explicitly labeled for PWM.

**ADC reading is always 0 or always at maximum**

Check the wiring. The wiper (center leg) of the potentiometer must be connected to an ADC-capable pin. If the wiper is floating or connected to a non-ADC pin, the reading will be stuck at one extreme. Also confirm that the outer legs are connected to 3.3 V and GND respectively — reversing them will invert the range.

**`device.pin.led` is undefined**

Not all platforms define the `device.pin.led` alias. Replace it with a specific pin number from your board's pinout diagram. For the Raspberry Pi Pico the onboard LED is on GPIO 25:

```javascript
const led = new device.io.PWM({
  pin: 25
});
```
