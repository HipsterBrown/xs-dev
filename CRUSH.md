# CRUSH.md - xs-dev Development Guide

## Build/Test Commands
- `pnpm run build` - Full build pipeline (format, lint, clean, compile)
- `pnpm run lint` - Run ESLint on src/
- `pnpm run format` - Format code with Prettier
- `pnpm run test` - Run all Jest tests
- `pnpm run watch` - Run Jest in watch mode
- `pnpm run coverage` - Run tests with coverage
- `pnpm run snapupdate` - Update Jest snapshots
- `tsx src/cli.ts` - Run CLI in development

## Code Style Guidelines
- **Imports**: Use ES6 imports, group by: node modules, local modules, types
- **Types**: Use TypeScript interfaces for objects, type aliases for unions
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces
- **Formatting**: Prettier config: no semicolons, single quotes
- **ESLint**: Uses eslint-config-love for strict TypeScript rules
- **Error Handling**: Use structured error objects, avoid throwing strings
- **CLI Structure**: Commands use @stricli/core, toolbox uses Gluegun patterns
- **File Organization**: Commands in src/commands/, utilities in src/toolbox/
- **Async/Await**: Prefer async/await over Promises, handle errors explicitly
- **Node.js**: Target Node 18+, use node: prefix for built-in imports
- **Testing**: Jest with ts-jest preset, integration tests in __tests__/

## Project Structure
- CLI tool for Moddable XS development automation
- TypeScript codebase with CommonJS output
- Uses pnpm for package management
- Supports multiple embedded platforms (ESP32, ESP8266, Pico, etc.)