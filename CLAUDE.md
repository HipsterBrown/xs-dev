# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

xs-dev is a CLI tool for automating the setup and usage of Moddable XS tools for embedded JavaScript development. It streamlines the installation and environment configuration for various hardware platforms including ESP32, ESP8266, Raspberry Pi Pico, NRF52, and WASM targets.

## Development Commands

**Build and Development:**
```bash
# Development CLI (uses tsx for TypeScript)
pnpm xs-dev

# Debug mode with full logging
pnpm xs-dev:debug

# Format code
pnpm format

# Lint code
pnpm lint

# Clean and full build
pnpm build
```

**Testing:**
```bash
# Run tests
pnpm test

# Watch mode for tests
pnpm watch

# Update snapshots
pnpm snapupdate

# Coverage report
pnpm coverage
```

**Documentation:**
```bash
# Start docs dev server
pnpm start:docs

# Build docs
pnpm build:docs

# Preview built docs
pnpm preview:docs
```

## Architecture

The project uses a modular CLI architecture built on top of Gluegun and @stricli/core:

**Core Structure:**
- `src/cli.ts` - Main CLI entry point using @stricli/core for command routing
- `src/commands/` - Individual command implementations (setup, build, run, init, etc.)
- `src/toolbox/` - Organized utilities by function area:
  - `build/` - Build system utilities
  - `setup/` - Platform-specific setup logic (esp32, esp8266, pico, nrf52, etc.)
  - `system/` - System interaction utilities
  - `prompt/` - User interaction helpers
  - `patching/` - File modification utilities

**Command Architecture:**
Commands are built using @stricli/core's `buildCommand` function and follow a consistent pattern:
- Type-safe option interfaces
- Brief documentation
- Async function handlers with LocalContext (extends CommandContext + Gluegun utilities)

**Platform Support:**
The toolbox is organized around device types defined in `src/types.ts`:
- Host platforms: darwin/mac, linux/lin, windows/win  
- Target devices: esp8266, esp32, wasm, pico, nrf52

Each platform has dedicated setup and update modules in `src/toolbox/setup/` and `src/toolbox/update/`.

**Key Dependencies:**
- Gluegun for CLI utilities (filesystem, system, prompt, etc.)
- @stricli/core for type-safe command routing
- serialport for device communication
- Various platform-specific tools for hardware setup

## Testing

Uses Jest with TypeScript support. Integration tests are in `__tests__/cli-integration.test.ts`.

## Documentation Site

Built with Astro + Starlight in the `docs/` directory. Content is in `docs/src/content/docs/`.