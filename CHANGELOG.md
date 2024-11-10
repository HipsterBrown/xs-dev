# v0.33.0 (Sun Nov 10 2024)

#### 💥 Breaking Change

- feat(pico): update SDK to v2.0.0 [#181](https://github.com/HipsterBrown/xs-dev/pull/181) ([@HipsterBrown](https://github.com/HipsterBrown))

#### Authors: 1

- Nick Hehr ([@HipsterBrown](https://github.com/HipsterBrown))

---

# v0.32.7 (Sun Nov 10 2024)

#### 🚀 Enhancement

- refactor(cli): migrate application entrypoint to Strcli [#180](https://github.com/HipsterBrown/xs-dev/pull/180) ([@HipsterBrown](https://github.com/HipsterBrown))
- chore: use default conventions-commits config ([@HipsterBrown](https://github.com/HipsterBrown))

#### Authors: 1

- Nick Hehr ([@HipsterBrown](https://github.com/HipsterBrown))

---

# v0.32.6 (Mon Sep 09 2024)

#### 🚀 Enhancement

- chore: replace release-it with auto [#177](https://github.com/HipsterBrown/xs-dev/pull/177) ([@HipsterBrown](https://github.com/HipsterBrown))

#### Authors: 1

- Nick Hehr ([@HipsterBrown](https://github.com/HipsterBrown))

---



### [0.32.5](https://github.com/HipsterBrown/xs-dev/compare/v0.32.4...v0.32.5) (2024-09-09)

### [0.32.4](https://github.com/HipsterBrown/xs-dev/compare/v0.32.3...v0.32.4) (2024-09-09)


### Bug Fixes

* **build/run:** dynamically create list of device targets ([#176](https://github.com/HipsterBrown/xs-dev/issues/176)) ([107db40](https://github.com/HipsterBrown/xs-dev/commit/107db40d87f19ba8e3d6dcc6da43cf7b2309354c))

### [0.32.3](https://github.com/HipsterBrown/xs-dev/compare/v0.32.2...v0.32.3) (2024-08-15)


### Bug Fixes

* **esp32:** source IDF python env when building, running project ([#172](https://github.com/HipsterBrown/xs-dev/issues/172)) ([e67db2f](https://github.com/HipsterBrown/xs-dev/commit/e67db2f9a0b618484c02e97217a81ffcc93393f4))

### [0.32.2](https://github.com/HipsterBrown/xs-dev/compare/v0.32.1...v0.32.2) (2024-08-14)


### Bug Fixes

* **scan:** source esp_idf before checking for esptool.py ([#171](https://github.com/HipsterBrown/xs-dev/issues/171)) ([e9e1ca8](https://github.com/HipsterBrown/xs-dev/commit/e9e1ca84167c850c6bd8c82526789385851ac40a))

### [0.32.1](https://github.com/HipsterBrown/xs-dev/compare/v0.32.0...v0.32.1) (2024-08-14)


### Bug Fixes

* **setup:** remove xs-dev-export.sh sourcing from shell profile ([#170](https://github.com/HipsterBrown/xs-dev/issues/170)) ([268f180](https://github.com/HipsterBrown/xs-dev/commit/268f180bdfd023b3d56f3310107c079cfce6b4f8))

## [0.32.0](https://github.com/HipsterBrown/xs-dev/compare/v0.31.2...v0.32.0) (2024-08-13)


### Features

* add clean and debug commands ([#169](https://github.com/HipsterBrown/xs-dev/issues/169)) ([4a0c77c](https://github.com/HipsterBrown/xs-dev/commit/4a0c77cfe805666c611b27af338987f334134535))

### [0.31.2](https://github.com/HipsterBrown/xs-dev/compare/v0.31.1...v0.31.2) (2024-08-13)


### Bug Fixes

* remove fontbm tool setup ([#168](https://github.com/HipsterBrown/xs-dev/issues/168)) ([e6a389d](https://github.com/HipsterBrown/xs-dev/commit/e6a389df01ef1ee5fb4e565386260b49898e56b1))

### [0.31.1](https://github.com/HipsterBrown/xs-dev/compare/v0.31.0...v0.31.1) (2024-08-13)

## [0.31.0](https://github.com/HipsterBrown/xs-dev/compare/v0.30.5...v0.31.0) (2024-08-12)


### Features

* **update:** use v5.3 tag of esp-idf ([#166](https://github.com/HipsterBrown/xs-dev/issues/166)) ([eb7f7c4](https://github.com/HipsterBrown/xs-dev/commit/eb7f7c4ed01c197b193889eb467473107f2a4482))

### [0.30.5](https://github.com/HipsterBrown/xs-dev/compare/v0.30.4...v0.30.5) (2024-07-29)

### [0.30.4](https://github.com/HipsterBrown/xs-dev/compare/v0.30.3...v0.30.4) (2024-03-23)


### Bug Fixes

* **setup/pico:** verify source of arm-gcc before removing ([1c8e8b3](https://github.com/HipsterBrown/xs-dev/commit/1c8e8b39624ab62755141794172bdae9e2167037))

### [0.30.3](https://github.com/HipsterBrown/xs-dev/compare/v0.30.2...v0.30.3) (2024-01-19)


### Bug Fixes

* **info:** verify moddable sdk git repo, include nrf52 support ([#160](https://github.com/HipsterBrown/xs-dev/issues/160)) ([7302cd5](https://github.com/HipsterBrown/xs-dev/commit/7302cd5446612a309d7f939f792a0be71d1719cf))

### [0.30.2](https://github.com/HipsterBrown/xs-dev/compare/v0.30.1...v0.30.2) (2024-01-04)


### Bug Fixes

* **init:** include manifest_net with io template ([b41cfde](https://github.com/HipsterBrown/xs-dev/commit/b41cfdec8f192ec2a2ec414998b87d5d02e1cd63))

### [0.30.1](https://github.com/HipsterBrown/xs-dev/compare/v0.30.0...v0.30.1) (2024-01-04)


### Bug Fixes

* update dependencies to address security audit ([c7ca519](https://github.com/HipsterBrown/xs-dev/commit/c7ca51937c670313efadbbdddb57fc3f965f7218))

## [0.30.0](https://github.com/HipsterBrown/xs-dev/compare/v0.29.0...v0.30.0) (2024-01-04)


### Features

* **pico:** add update command, use new gcc-arm-embedded cask on mac ([#157](https://github.com/HipsterBrown/xs-dev/issues/157)) ([0b63a23](https://github.com/HipsterBrown/xs-dev/commit/0b63a2331e7cbf3ede109502b9d31e45d2bba2c7))

## [0.29.0](https://github.com/HipsterBrown/xs-dev/compare/v0.28.1...v0.29.0) (2024-01-04)


### Features

* **esp32:** update esp-idf version to support latest Moddable SDK ([#156](https://github.com/HipsterBrown/xs-dev/issues/156)) ([11c9ff5](https://github.com/HipsterBrown/xs-dev/commit/11c9ff5b2aa89cbabb5b811e3c0fec759a83cb24))

## [0.28.1](https://github.com/HipsterBrown/xs-dev/compare/v0.28.0...v0.28.1) (2023-12-08)


### Bug Fixes

* **setup/esp32:** update a package name in linux.ts ([#152](https://github.com/HipsterBrown/xs-dev/issues/152)) ([357d7e0](https://github.com/HipsterBrown/xs-dev/commit/357d7e04ca9b2e0e00d645a390d774f71be5efbf))

## [0.28.0](https://github.com/HipsterBrown/xs-dev/compare/v0.27.5...v0.28.0) (2023-10-12)


### Features

* add support for ESP-IDF v5 & mcpack ([#149](https://github.com/HipsterBrown/xs-dev/issues/149)) ([0200d56](https://github.com/HipsterBrown/xs-dev/commit/0200d56f92adc609b926ff98b2a024277d4a3809))

## [0.27.5](https://github.com/HipsterBrown/xs-dev/compare/v0.27.4...v0.27.5) (2023-09-29)


### Bug Fixes

* **setup/nrf52:** create the decompression stream when needed ([#147](https://github.com/HipsterBrown/xs-dev/issues/147)) ([f2e9b92](https://github.com/HipsterBrown/xs-dev/commit/f2e9b92486b4837a2ad0c25f35297b171b8e94e5))

## [0.27.4](https://github.com/HipsterBrown/xs-dev/compare/v0.27.3...v0.27.4) (2023-08-26)


### Bug Fixes

* remove dep on debug tools dir, ignore empty git tag ([#142](https://github.com/HipsterBrown/xs-dev/issues/142)) ([2117b02](https://github.com/HipsterBrown/xs-dev/commit/2117b02096d5af300348f878e12827b83325c1fe))

## [0.27.3](https://github.com/HipsterBrown/xs-dev/compare/v0.27.2...v0.27.3) (2023-08-23)


### Bug Fixes

* **setup:** fix ESP8266 setup on Windows ([#141](https://github.com/HipsterBrown/xs-dev/issues/141)) ([3ecd6fe](https://github.com/HipsterBrown/xs-dev/commit/3ecd6fe1abec38a3b914b1b9520a47f5ba51fddb))

## [0.27.2](https://github.com/HipsterBrown/xs-dev/compare/v0.27.1...v0.27.2) (2023-08-18)


### Bug Fixes

* **nrf52:** make node-lzma an optional dep, handle dynamic import ([#140](https://github.com/HipsterBrown/xs-dev/issues/140)) ([f227830](https://github.com/HipsterBrown/xs-dev/commit/f2278308aca851bd7fce6692ab350e039a6be5e5))

## [0.27.1](https://github.com/HipsterBrown/xs-dev/compare/v0.27.0...v0.27.1) (2023-08-15)

## [0.27.0](https://github.com/HipsterBrown/xs-dev/compare/v0.26.0...v0.27.0) (2023-08-11)


### Features

* add support for moddable four + nrf52 device setup ([#138](https://github.com/HipsterBrown/xs-dev/issues/138)) ([85b5e73](https://github.com/HipsterBrown/xs-dev/commit/85b5e735156afff62ac9789f0a2538032083034d))

## [0.26.0](https://github.com/HipsterBrown/xs-dev/compare/v0.25.13...v0.26.0) (2023-07-31)


### Features

* **setup:** use versioned release artifacts in Windows "xs-dev setup" ([#136](https://github.com/HipsterBrown/xs-dev/issues/136)) ([73e6a25](https://github.com/HipsterBrown/xs-dev/commit/73e6a255e961cf8c27f4fb2fd3c11e9a0e773078))

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