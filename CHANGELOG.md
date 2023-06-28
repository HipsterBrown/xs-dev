

## [0.25.13](https://github.com/HipsterBrown/xs-dev/compare/v0.25.12...v0.25.13) (2023-06-28)


### Bug Fixes

* **setup/esp32:** update esp-idf version from 4.4.2 to 4.4.3 ([#134](https://github.com/HipsterBrown/xs-dev/issues/134)) ([83eba8a](https://github.com/HipsterBrown/xs-dev/commit/83eba8a352b3d82f738ce2fb0a788ad5f3f9b23b))

## [0.25.12](https://github.com/HipsterBrown/xs-dev/compare/v0.25.11...v0.25.12) (2023-06-16)

## [0.25.11](https://github.com/HipsterBrown/xs-dev/compare/v0.25.10...v0.25.11) (2023-06-16)

## [0.25.10](https://github.com/HipsterBrown/xs-dev/compare/v0.25.9...v0.25.10) (2023-06-16)

## [0.25.9](https://github.com/HipsterBrown/xs-dev/compare/v0.25.8...v0.25.9) (2023-06-16)

## [0.25.8](https://github.com/HipsterBrown/xs-dev/compare/v0.25.7...v0.25.8) (2023-06-16)

## [0.25.7](https://github.com/HipsterBrown/xs-dev/compare/v0.25.6...v0.25.7) (2023-06-16)

### [0.25.6](https://github.com/HipsterBrown/xs-dev/compare/v0.25.5...v0.25.6) (2023-06-16)

* docs: migrate astro theme to starlight (#127) (c27007e)

* fix(setup): install pico extras (#123) (a00181b)

* docs: update starter guide with blinky step, fix init overwrite (cfc700e)

* chore: update docs paths for new domain name (5c44bd5)

* chore: add cname to gh pages deployment (4461d4b)

* feat(setup): add --source-repo flag for custom SDK repo config (#119) (f137467)

* fix(pico): pin branch for sdk, examples (#118) (aed4780)

* chore(docs): migrate preact components to solid-js (#116) (efbac68)

* fix(build): unset default output (#115) (ba29c6a)

* fix(exec): check for buffer response from stdout, convert to string (#113) (a553e23)

* fix(exec): defensively check sourceEnvironment results object (1987bf8)

* docs: fix edit on github link path (efcbb8d)

* feat: automatically source environment variables into process (#112) (cb61ca1)

* feat(run): add --log flag to show debug output in terminal (#108) (9b24a93)

### [0.22.2](https://github.com/HipsterBrown/xs-dev/compare/v0.22.0...vnull) (2023-02-24)

# xs-dev

## 0.22.0

### Minor Changes

- 6175bec: Adds "--config" flag to build and run commands for setting "mc/config"

## 0.21.0

### Minor Changes

- ac8ae34: Try downloading unversial mac binary from new SDK releases

## 0.20.0

### Minor Changes

- 3b2b12c: Add new "doctor" command and additional prompts during setup

## 0.19.3

### Patch Changes

- 4a1cadc: Fix symlink teardown with correct OS type logic

## 0.19.2

### Patch Changes

- 52fa88b: Update dependencies, resolving security warnings

## 0.19.1

### Patch Changes

- e43cd9e: Remove xsbug app symlink on macos

## 0.19.0

### Minor Changes

- 5440efa: Adds "--asyncMain" option to init command

## 0.18.0

### Minor Changes

- 40f6407: Initial Windows support for system tooling, ESP8266, ESP32 setup

## 0.17.0

### Minor Changes

- 4c63c2a: Add build command for preparing production release output and deployment

## 0.16.0

### Minor Changes

- cb9b3d7: Add support for target-branch option to setup, update commands; each pulls the latest Moddable release by default now

## 0.15.1

### Patch Changes

- aeff72f: Fix esp-idf exports sourcing during ESP32 update command

## 0.15.0

### Minor Changes

- Use latest version of ESP-IDF

## 0.14.3

### Patch Changes

- Filter picotool scans using usb bus address

## 0.14.2

### Patch Changes

- Catch picotool error thrown when no devices found

## 0.14.1

### Patch Changes

- Reboot pico boards to application mode before scanning

## 0.14.0

### Minor Changes

- Add picotool install to pico setup and scanning

## 0.13.2

### Patch Changes

- Set PICO_GCC_ROOT to brew prefix on macOS

## 0.13.1

### Patch Changes

- Catch scan errors thrown by esptool

## 0.13.0

### Minor Changes

- Add --device flag for include & remove commands

## 0.12.0

### Minor Changes

- Initialize new project from Moddable example template

## 0.11.1

### Patch Changes

- Address include/remove module handling issues

## 0.11.0

### Minor Changes

- Display pico and all simulators in runnable device list, add pico to setup device list

## 0.10.1

### Patch Changes

- Add better error message for missing examples and check for CLI updates periodically

## 0.10.0

### Minor Changes

- Resolve pico sdk directory env variable, add to teardown

## 0.9.0

### Minor Changes

- Add pico setup support

## 0.8.0

### Minor Changes

- Add scan command

## 0.7.0

### Minor Changes

- Update ESP32 tooling to v4.4

## 0.6.0

### Minor Changes

- Add linux support for fontbm setup

## 0.5.0

### Minor Changes

- Add fontbm tool setup

## 0.4.0

### Minor Changes

- Upgrade gluegun dependency to v5

## 0.3.0

### Minor Changes

- Initial linux platform support

## 0.2.0

### Minor Changes

- Add --list-devices flag to setup and run commands

## 0.1.1

### Patch Changes

- Teardown correct esp directory, ensure MODDABLE exists during device setup

## 0.1.0

### Minor Changes

- 4d76b74: Collect all env changes in shared file, add automated teardown command