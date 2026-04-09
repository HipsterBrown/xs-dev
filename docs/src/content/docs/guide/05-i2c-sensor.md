---
title: I2C Sensor Reading
description: Read temperature and humidity from an SHT30 sensor over I2C using ECMA-419
---

**Read temperature and humidity from an SHT30 sensor over I2C using ECMA-419**

This guide introduces I2C — the most common serial protocol for attaching sensors to a microcontroller. You will connect a temperature and humidity sensor, learn how I2C addressing works, send a command to trigger a measurement, and parse the multi-byte response using `DataView`.

## What is I2C?

I2C (Inter-Integrated Circuit, pronounced "I-squared-C") is a two-wire serial bus: one wire carries the clock signal (SCL) and the other carries data (SDA). Multiple devices can share the same two wires simultaneously because each device has a unique 7-bit address — the bus controller calls a device by its address before every transaction.

A useful mental model: I2C is like a small network where each sensor has a fixed address baked in at the factory (analogous to a static IP). When you open a connection, you dial that address and the right device answers.

## Project setup

Create a new project with the `--io` flag to include the ECMA-419 hardware IO APIs:

```
xs-dev init --io i2c-sensor
```

If you are new to the project layout and `package.json` manifest this generates, see the [LED blink guide](/guide/02-blinky) for a full walkthrough. The `device.io.I2C` class needed for this guide is already included in the IO manifest — no additional manifest entries are required. Once the project is ready, run it on your connected device with:

```
xs-dev run --device <device>
```

## Wiring

The SHT30 is a 3.3 V sensor with four pins to connect:

| SHT30 pin | Board pin |
|-----------|-----------|
| VCC       | 3.3 V     |
| GND       | GND       |
| SDA       | I2C SDA   |
| SCL       | I2C SCL   |

I2C pin locations vary by board. For the Raspberry Pi Pico, [pico.pinout.xyz](https://pico.pinout.xyz/) is a convenient reference — look for pins labeled `I2C0 SDA` and `I2C0 SCL` (GPIO 4 and 5 on the default bus). Other boards will have their own designated I2C pins listed in their datasheets or pinout diagrams.

## Finding your device's I2C address

Every I2C device has a 7-bit address defined by the manufacturer and printed in the datasheet. The SHT30's default address is `0x44`. Some sensors let you change the address by pulling an `ADDR` pin high or low, but for this guide the default is fine.

**Verifying the address with i2cscan**

Before writing any sensor code it is worth confirming the device is visible on the bus. The Moddable SDK ships an `i2cscan` example that walks every valid I2C address and reports which ones respond:

```
xs-dev run --example pins/i2cscan --device <device>
```

Watch the xsbug console. When your SHT30 is correctly wired you should see a line like:

```
Found 0x44
```

If nothing appears, double-check your wiring — especially that SDA and SCL are not swapped.

**A note on address errors**

The I2C constructor succeeds immediately, regardless of whether a device is present at the given address. The error only surfaces when you actually call `write` or `read` and the bus gets no acknowledgement from the device. This means a typo in the address does not fail at setup time — it fails later, during the transaction, with an error message that may not make the cause obvious. Confirming the address with `i2cscan` before writing sensor code saves debugging time.

## Connecting to the sensor

Replace the contents of `main.js` with the following:

```javascript
import Timer from "timer";

const SHT30_ADDRESS = 0x44;

const sensor = new device.io.I2C({
  address: SHT30_ADDRESS,
  ...device.I2C.default
});
```

`device.io.I2C` is the [ECMA-419 I2C IO class](https://embedded.js.org/api/io-class/i2c/). It is available because the `$(MODULES)/io/manifest.json` entry in `package.json` pulls in the TC53 IO module bundle.

`device.I2C.default` holds the SDA and SCL pin numbers for the board's default I2C bus, along with the bus speed. Spreading it into the constructor options means you do not have to look up pin numbers for every board — the device platform fills them in automatically.

`address` is the 7-bit I2C address of the specific device you want to talk to on that bus.

## Triggering a measurement

The SHT30 does not stream data continuously. You ask it to take a reading, wait a short time, then collect the result. This is called single-shot mode.

Add the following after creating the sensor:

```javascript
const SHT30_CMD_MEASURE_HIGH_REP     = 0x24;
const SHT30_CMD_MEASURE_HIGH_REP_ARG = 0x00;

const cmd = new Uint8Array([SHT30_CMD_MEASURE_HIGH_REP, SHT30_CMD_MEASURE_HIGH_REP_ARG]);
sensor.write(cmd.buffer);

Timer.delay(15);  // wait ~15 ms for the measurement to complete
```

The two command bytes (`0x24, 0x00`) tell the sensor to perform a single measurement at high repeatability. `Timer.delay` pauses execution for 15 milliseconds while the sensor samples the temperature and humidity internally. Writing the raw hex values directly into the array would work, but named constants make the intent clear when you revisit the code later.

## Reading and parsing the response

After the delay, read the 6-byte response from the sensor:

```javascript
const response = new Uint8Array(6);
sensor.read(response.buffer);
```

The sensor returns the data in this layout:

| Byte index | Contents             |
|------------|----------------------|
| 0          | Temperature MSB      |
| 1          | Temperature LSB      |
| 2          | Temperature CRC      |
| 3          | Humidity MSB         |
| 4          | Humidity LSB         |
| 5          | Humidity CRC         |

MSB means Most Significant Byte (the high byte) and LSB means Least Significant Byte (the low byte). The sensor sends values in big-endian order: the high byte comes first. The CRC bytes are checksums for error detection — this guide skips verifying them, but a production driver would check them to catch corrupted readings.

### Parsing with DataView

To convert the raw bytes into a 16-bit integer, you need to combine the MSB and LSB. The manual approach works:

```javascript
const rawTemp = (response[0] << 8) | response[1];
```

The `<<` operator shifts the high byte 8 bit positions to the left — equivalent to multiplying by 256 — making room for the low byte. The `|` operator then fills in those lower 8 bits. Think of it like combining two hex digits: `0xAB` and `0xCD` become `0xABCD`.

`DataView` provides a more readable alternative that also handles endianness explicitly:

```javascript
const view = new DataView(response.buffer);
const rawTemp = view.getUint16(0, false); // offset 0, big-endian
const rawHum  = view.getUint16(3, false); // offset 3, big-endian (skips CRC at index 2)
```

`getUint16(offset, littleEndian)` reads two bytes starting at `offset` and combines them into a 16-bit unsigned integer. Passing `false` as the second argument tells it to treat the bytes as big-endian — high byte first, which is how the SHT30 sends its data. Compared to the manual bit-shift version, `DataView` makes the endianness intent explicit and scales cleanly when you are working with many fields in a response buffer.

### Converting raw values to physical units

With the raw integers in hand, apply the formulas from the SHT30 datasheet:

```javascript
const celsius  = -45 + 175 * (rawTemp / 65535);
const humidity = 100 * (rawHum  / 65535);
```

Both formulas normalize the 16-bit raw value (0–65535) to a 0.0–1.0 range and then scale it to the physical unit. Temperature maps to a −45 °C to +130 °C range. Humidity maps to 0–100 percent relative humidity.

## Putting it together

Here is the complete `main.js` that takes a measurement every second and logs the results:

```javascript
import Timer from "timer";

const SHT30_ADDRESS                  = 0x44;
const SHT30_CMD_MEASURE_HIGH_REP     = 0x24;
const SHT30_CMD_MEASURE_HIGH_REP_ARG = 0x00;

const sensor = new device.io.I2C({
  address: SHT30_ADDRESS,
  ...device.I2C.default
});

const cmd      = new Uint8Array([SHT30_CMD_MEASURE_HIGH_REP, SHT30_CMD_MEASURE_HIGH_REP_ARG]);
const response = new Uint8Array(6);

Timer.repeat(() => {
  sensor.write(cmd.buffer);
  Timer.delay(15);  // blocking spin-wait; acceptable here for a simple 1-second polling loop

  sensor.read(response.buffer);

  const view    = new DataView(response.buffer);
  const rawTemp = view.getUint16(0, false);
  const rawHum  = view.getUint16(3, false);

  const celsius  = -45 + 175 * (rawTemp / 65535);
  const humidity = 100 * (rawHum  / 65535);

  trace(`Temperature: ${celsius.toFixed(1)} C  Humidity: ${humidity.toFixed(1)} %\n`);
}, 1000);
```

Allocating `cmd` and `response` outside the timer callback avoids creating new `Uint8Array` instances on every tick, which matters on microcontrollers with limited memory and no garbage-collected heap the size you are used to from Node.js.

## Run it

Build and flash the project:

```
xs-dev run --device <device>
```

Once the code is running, open xsbug and watch the console. You should see a new line appear roughly once per second:

```
Temperature: 22.4 C  Humidity: 48.7 %
```

The exact numbers will reflect the actual temperature and humidity where you are running the device. If you breathe on the sensor the humidity reading will rise noticeably within a couple of seconds — a good way to confirm it is working.

## Keep exploring!

Try converting the temperature to Fahrenheit before logging it: `const fahrenheit = celsius * 9 / 5 + 32`.

Experiment with the polling interval — change `1000` in `Timer.repeat` to `500` to sample twice per second, or to `5000` to sample every five seconds and observe how responsive the readings feel.

You could also add a check that stops logging if the temperature or humidity values fall outside a plausible range (which can happen if the sensor is wired incorrectly and `read` returns zeros) and prints a warning instead.

## Troubleshooting

**Values are all zeros or clearly wrong**

This usually means the sensor is not responding correctly. Check:

- I2C address: confirm the SHT30 is at `0x44`. Run `xs-dev run --example pins/i2cscan --device <device>` and verify `Found 0x44` appears in the console. If a different address appears, update `SHT30_ADDRESS` to match.
- Wiring: confirm SDA and SCL are connected to the correct pins and are not swapped. Confirm VCC is connected to 3.3 V, not 5 V.

**Error thrown on `write` or `read`**

The I2C bus did not receive an acknowledgement from the device. The most common causes are an incorrect address, swapped SDA/SCL lines, or a loose wire. Run `i2cscan` to confirm the device is visible, then recheck the pin numbers for your board.

**Nothing appears in xsbug**

Make sure xsbug is open before you run the project, and that the device is connected over USB. See [Hello Console](/guide/01-hello-console) for a refresher on setting up the debugger connection.
