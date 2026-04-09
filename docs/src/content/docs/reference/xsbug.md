---
title: xsbug Debugger
description: How to use the xsbug debugger with xs-dev projects
---

xsbug is the graphical debugger for XS JavaScript programs. It ships with the Moddable SDK and is the primary tool for inspecting program state, reading log output, and profiling memory usage on embedded targets.

When you run `xs-dev run`, xsbug launches automatically and connects to the running program — either in the simulator or on a physical device over USB.

## Console panel

The Console panel is where `console.log` and `trace` output appears. It is the embedded equivalent of the browser DevTools console or Node.js stdout. Any string written with `console.log` in your program will show up here.

```javascript
console.log("sensor value:", reading);
```

Output from multiple runs accumulates in the panel until it is cleared manually.

## Instruments panel

The Instruments panel shows live runtime metrics including memory usage, heap statistics, and performance counters. This is the only place to view memory consumption for a running XS program.

XS does not provide a `process.memoryUsage()` equivalent or any runtime API for reading memory stats from user code. If you need to understand how much heap your program is consuming, open the Instruments panel in xsbug while the program is running.

Key metrics shown in Instruments:

- **Heap used / heap available** — current allocation vs. total available heap
- **Slot and chunk usage** — XS-specific memory regions for JS values and object data
- **Garbage collection activity** — frequency and impact of GC cycles

## Breakpoints and stepping

xsbug supports standard debugger features: setting breakpoints, stepping over or into function calls, and inspecting local variables and the call stack.

You can trigger a breakpoint from code using the `debugger` statement:

```javascript
debugger; // execution pauses here in xsbug
let result = computeSomething();
```

This is the same `debugger` statement you would use in browser DevTools or Node.js. When the XS runtime hits it, execution halts and xsbug brings the relevant source file into focus with the current line highlighted.

From that point the standard controls apply: step over, step into, step out, resume, and inspect any variable in scope.

## Network (WiFi) connection

xsbug can connect to a device over a WiFi network rather than USB. This is useful when the device is deployed somewhere that makes a wired connection impractical, or when you want to debug networking code that conflicts with serial communication.

The device initiates the connection to xsbug running on the host machine. The host IP address and port are typically provided at build time via configuration flags. Refer to the official xsbug documentation linked below for setup details.

## Further reading

For complete documentation — including the full Instruments panel reference, source-level debugging details, and network connection setup — see the official Moddable documentation:

[xsbug documentation on GitHub](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/xs/xsbug.md)
