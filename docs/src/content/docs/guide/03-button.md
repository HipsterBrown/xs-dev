---
title: Button Input
description: Read button presses using digital input and debounce with ECMA-419
---

**Read button presses using digital input and debounce with ECMA-419**

## Project setup

Create a new project with the `--io` flag, the same way as the [previous guide](/guide/02-blinky):

```
xs-dev init --io button-input
```

Once the project is created, run it on your connected device with:

```
xs-dev run --device <device>
```

The `moddable.manifest` field in `package.json` already includes the TC53 IO module bundle from `xs-dev init --io`, so no additional manifest changes are needed. See [Manifest Anatomy](/reference/manifest-anatomy) for a full breakdown of that configuration.

## Wiring

<!-- TODO: make a Fritzing diagram to include in the guide -->

Connect one leg of the button to a GPIO pin and the other leg to 3.3V. That is all the hardware you need — no external resistor required. The `Digital.InputPullDown` mode enables an internal pull-down resistor, which holds the pin at a known LOW state when the button is not pressed. When the button is pressed, the circuit to 3.3V pulls the pin HIGH.

This means the logic is intuitive: reading `1` means pressed, reading `0` means released.

To find the correct GPIO pin numbers for your board, refer to its pinout diagram. For the Raspberry Pi Pico, [pico.pinout.xyz](https://pico.pinout.xyz/) is a useful reference.

## Reading the button

An **interrupt** is a hardware signal that tells the processor to immediately stop what it is doing and call a specific function — then resume where it left off. Digital input with an interrupt callback is the idiomatic ECMA-419 pattern for responding to hardware events. If you have written JavaScript for the web or server, the mental model is similar to `addEventListener`: you register a callback that fires when something changes, rather than checking the value repeatedly.

Replace the contents of `main.js` with the following:

```javascript
const Digital = device.io.Digital;

const button = new Digital({
  pin: device.pin.button,
  mode: Digital.InputPullDown,
  edge: Digital.Rising | Digital.Falling,
  onReadable() {
    const value = this.read();
    console.log(`Button: ${value ? "pressed" : "released"}`);
  }
});
```

<!-- TODO: make a note about the `pin` value when wiring up manually -->

### What each option does

```javascript
const button = new Digital({
  pin: device.pin.button,
  mode: Digital.InputPullDown,
  edge: Digital.Rising | Digital.Falling,
  onReadable() { ... }
});
```

`device.pin.button` is a built-in pin alias, the input equivalent of `device.pin.led` from the previous guide. It resolves to the pin number of the primary button on supported platforms.

`Digital.InputPullDown` sets the pin as an input and activates the internal [pull-down resistor](https://embedded.js.org/glossary/#pull-down), giving it a stable LOW baseline when nothing is connected to 3.3V.

`edge: Digital.Rising | Digital.Falling` tells the runtime to call `onReadable` on both transitions — LOW to HIGH (rising, button pressed) and HIGH to LOW (falling, button released). You can listen for only one direction by omitting the other flag.

`onReadable` is the callback that fires on each detected edge. Inside it, `this.read()` returns the current pin value: `1` when the button is held down, `0` when it is released.

## Understanding bouncing

Mechanical buttons are not perfect switches. When the contacts meet or separate, they briefly bounce against each other, producing a rapid series of transitions over the course of a few milliseconds. What feels like a single press to your finger can appear to the microcontroller as dozens of rising and falling edges in quick succession.

Left unhandled, this means a single button press fires your callback many times rather than once.

## Debouncing

A simple software debounce tracks the time of the last handled transition and ignores any that arrive too soon after it. Update `main.js` with the following:

```javascript
import Time from "time";

const Digital = device.io.Digital;
let lastTime = 0;
const DEBOUNCE_MS = 50;

const button = new Digital({
  pin: device.pin.button,
  mode: Digital.InputPullDown,
  edge: Digital.Rising | Digital.Falling,
  onReadable() {
    const now = Time.ticks;
    if (Time.delta(lastTime, now) < DEBOUNCE_MS) return;
    lastTime = now;
    const value = this.read();
    console.log(`Button: ${value ? "pressed" : "released"}`);
  }
});
```

`Time.ticks` returns the number of milliseconds elapsed since the device booted — similar to `Date.now()` in a browser, but counting from boot rather than the Unix epoch. `Time.delta(start, end)` computes the elapsed time between two ticks values, handling counter rollover correctly (preferable to raw subtraction `now - lastTime`). Both come from the `"time"` module — distinct from the `"timer"` module used for `Timer.repeat` and `Timer.set`. Both are included automatically via `manifest_base.json` in all xs-dev projects, so no extra manifest entries are needed.

The guard `if ((now - lastTime) < DEBOUNCE_MS) return` silently discards any transition that arrives within 50 milliseconds of the previous one. After the window passes, the next transition is treated as a fresh event and `lastTime` is updated. Fifty milliseconds is a reasonable starting point; most buttons settle well within that window, and the delay is imperceptible to a human.

## Run it

With your device connected over USB, run the project:

```
xs-dev run --device <device>
```

Open the xsbug console. Each time you press the button you should see:

```
Button: pressed
Button: released
```

If you were to remove the debounce guard and press the button once, you would likely see several lines appear in rapid succession before the state settles. The guard reduces this to exactly one event per state change.

When you are finished with the button, call `button.close()` to release the pin and free any associated resources. Full guidance on resource management will be covered in a future reference page.

## Keep exploring!

Try modifying the debounce threshold or toggling an LED on each press using the pattern from the [previous guide](/guide/02-blinky).

Ready to go beyond on/off signals? Continue to [Analog Input and PWM Output](/guide/04-analog-pwm).

## Troubleshooting

**`device.pin.button` is undefined**

Not every platform defines a built-in button alias. If the program throws or behaves as if no button exists, supply the pin number directly:

```javascript
const button = new Digital({
  pin: 14, // example GPIO pin number — check your board's pinout
  mode: Digital.InputPullDown,
  edge: Digital.Rising | Digital.Falling,
  onReadable() {
    const value = this.read();
    console.log(`Button: ${value ? "pressed" : "released"}`);
  }
});
```

Consult your board's pinout diagram for the correct number. For the Raspberry Pi Pico, see [pico.pinout.xyz](https://pico.pinout.xyz/).

**Button always reads HIGH or always reads LOW**

If the value never changes regardless of the button state, check the following:

- Verify the button is wired between the GPIO pin and 3.3V (not GND). With `InputPullDown`, pressing should bring the pin HIGH.
- If your circuit wires the button between the GPIO pin and GND instead, switch to `Digital.InputPullUp`. In that configuration the pin rests HIGH and goes LOW when pressed — reverse the pressed/released labels in your `console.log` call accordingly.
- Confirm the pin number matches the physical connection on your board.
