#!/usr/bin/env zx

const MODDABLE_REPO = "https://github.com/Moddable-OpenSource/moddable";
const HOME_DIR = os.homedir();
const INSTALL_DIR = path.resolve(HOME_DIR, ".local", "share");
const INSTALL_PATH =
  process.env.MODDABLE || path.resolve(INSTALL_DIR, "moddable");
const BIN_PATH = path.resolve(INSTALL_PATH, "build", "bin", "mac", "release");
const exec = $;
const [, command] = argv._;

const PROFILE = await (async function () {
  const shell = process.env.SHELL || (await exec`echo $0`);
  if (shell.includes("zsh")) return ".zshrc";
  return ".profile";
})();
const PROFILE_PATH = path.resolve(HOME_DIR, PROFILE);

await fs.ensureFile(PROFILE_PATH);
console.log(chalk.blue(`Using ${PROFILE} environment config`));

async function appendToProfile(str) {
  await exec`echo ${str} >> ${PROFILE_PATH}`;
}

async function existsInProfile(str) {
  const { stdout: file } = await exec`cat ${PROFILE_PATH}`;
  return file.includes(str);
}

if (command === "init") {
  const [, , name] = argv._;

  if (!name) {
    console.error(
      "The init command must include a name, i.e. ./xs-dev.mjs init my-project"
    );
    process.exit(1);
  }

  const projectPath = path.join(".", name);
  const includeTypes = argv.typescript;

  await fs.outputJson(path.join(projectPath, "manifest.json"), {
    include: [
      "$(MODDABLE)/examples/manifest_base.json",
      includeTypes && "$(MODDABLE)/examples/manifest_typings.json",
    ].filter(Boolean),
    modules: {
      "*": "./main",
    },
  });

  await fs.outputFile(
    path.join(projectPath, includeTypes ? "main.ts" : "main.js"),
    `
debugger;

let message = "Hello, world - sample";
trace(message);
  `
  );

  console.log(chalk.green("Created new xs project! Run with `xs-dev.mjs run`"));
  process.exit(0);
}

if (command === "run") {
  let [, , projectPath] = argv._;
  projectPath = projectPath || ".";

  cd(projectPath);

  const deviceAliases = { esp8266: "esp" };
  const osPlatforms = { darwin: "mac", windows_nt: "win", linux: "lin" };
  const PLATFORM =
    deviceAliases[argv.device] ||
    argv.device ||
    osPlatforms[os.type().toLowerCase()];
  const UPLOAD_PORT =
    argv.port || process.env.UPLOAD_PORT || "/dev/cu.SLAB_USBtoUART";
  await exec`UPLOAD_PORT=${UPLOAD_PORT} mcconfig -d -m -p ${PLATFORM}`;
  process.exit(0);
}

if (command === "include") {
  let [, , dep] = argv._;

  if (!dep) {
    console.error(
      "Dependency path required for `include` command: `xs-dev.mjs include moddable/network/wifi`"
    );
    process.exit(1);
  }

  if (dep.startsWith("moddable")) {
    dep = dep.replace("moddable/", "");
    const manifest = await fs.readJson("./manifest.json");
    const includes = new Set(manifest.include);
    includes.add(`$(MODDABLE)/modules/${dep}/manifest.json`);
    await fs.outputJson("./manifest.json", {
      ...manifest,
      include: Array.from(includes),
    });
    console.log(chalk.green("Added module dependency to project!"));
  } else {
    console.warn("Only moddable dependencies are supported at this time.");
  }

  process.exit(0);
}

if (command === "run-example") {
  if (argv.list) {
    console.log(chalk.blue("Available example projects to run:"));
    // read $MODDABLE/examples to find all directories with a manifest.json
    cd(path.resolve(INSTALL_PATH, "examples"));
    await exec`ls -d */`;
  }

  process.exit(0);
}

if (command === "update") {
  console.log(chalk.blue("Checking for SDK changes"));

  // 1. update clone of repo
  cd(INSTALL_PATH);
  const { stdout: currentRev } = await exec`git rev-parse public`;
  const {
    stdout: removeRev,
  } = await exec`git ls-remote origin refs/heads/public`;

  if (removeRev.split("\t").shift() === currentRev.trim()) {
    console.log(chalk.green("Moddable SDK already up to date!"));
    process.exit(0);
  }

  console.log(chalk.blue("Updating Moddable SDK"));
  await exec`git pull`.pipe(process.stdout);

  // 2. clear build cache
  await exec`rm -rf build/bin`;
  await exec`rm -rf build/tmp`;

  // 3. rebuild tooling
  cd(path.resolve(INSTALL_PATH, "build", "makefiles", "mac"));
  await exec`make`.pipe(process.stdout);

  // 4. profit
  console.log(
    chalk.green(`
    Moddable SDK successfully updated! Start the xsbug.app and run the "helloworld example": ./xs-dev.mjs test'
  `)
  );
  process.exit(0);
}

if (command === "test") {
  const deviceAliases = { esp8266: "esp" };
  const osPlatforms = { darwin: "mac", windows_nt: "win", linux: "lin" };
  const PLATFORM =
    deviceAliases[argv.device] ||
    argv.device ||
    osPlatforms[os.type().toLowerCase()];
  console.log(chalk.blue(`Running hello world example for ${PLATFORM}`));
  const UPLOAD_PORT =
    argv.port || process.env.UPLOAD_PORT || "/dev/cu.SLAB_USBtoUART";

  cd(path.resolve(INSTALL_PATH, "examples", "helloworld"));
  await exec`UPLOAD_PORT=${UPLOAD_PORT} mcconfig -d -m -p ${PLATFORM}`;
  process.exit(0);
}

if (command === "setup") {
  if (argv.device === "esp32") {
    console.log(chalk.blue("Setting up ESP32 SDK"));
    const ESP_IDF_REPO = "https://github.com/espressif/esp-idf.git";
    const ESP_BRANCH = "v4.3.1";
    const ESP32_DIR = path.resolve(INSTALL_DIR, "esp32");
    const IDF_PATH = path.resolve(ESP32_DIR, "esp-idf");

    // 1. ensure ~/.local/share/esp32 directory
    console.log(chalk.blue("Ensuring esp32 directory"));
    await fs.ensureDir(ESP32_DIR);

    // 2. clone esp-idf into ~/.local/share/esp32/esp-idf
    if (!(await fs.pathExists(IDF_PATH))) {
      console.log(chalk.blue("Cloning esp-idf repo"));
      await exec`git clone -b ${ESP_BRANCH} --recursive ${ESP_IDF_REPO} ${IDF_PATH}`;
    }
    // 3. brew install python3, cmake, ninja, dfu-util
    console.log(chalk.blue("Installing / upgrading homebrew dependencies"));
    await exec`brew install python; brew upgrade python`.pipe(process.stdout);
    await exec`brew install cmake; brew upgrade cmake`.pipe(process.stdout);
    await exec`brew install ninja; brew upgrade ninja`.pipe(process.stdout);
    await exec`brew install dfu-util; brew upgrade dfu-util`.pipe(
      process.stdout
    );

    // 4. install pip, if needed
    if (!(await exec`which pip3`)) {
      console.log(chalk.blue("Installing pip3"));
      await exec`sudo easy_install pip3`.pipe(process.stdout);
    }

    // 5. pip install pyserial
    console.log(chalk.blue("Installing pyserial"));
    await exec`python3 -m pip install pyserial`.pipe(process.stdout);

    // 6. append IDF_PATH env export to shell profile
    if (!process.env.IDF_PATH) {
      console.log(chalk.blue("Configuring $IDF_PATH"));
      process.env.IDF_PATH = IDF_PATH;
      await appendToProfile(`export IDF_PATH=${IDF_PATH}`);
    }

    // 7. cd to IDF_PATH, run install.sh
    console.log(chalk.blue("Install esp-idf tooling"));
    cd(IDF_PATH);
    await exec`./install.sh`.pipe(process.stdout);

    // 8. append 'source $IDF_PATH/export.sh' to shell profile
    console.log(chalk.blue("Sourcing esp-idf environment"));
    if (!(await existsInProfile("$IDF_PATH/export.sh"))) {
      await appendToProfile("source $IDF_PATH/export.sh");
    }
    await exec`source $IDF_PATH/export.sh`;

    console.log(
      chalk.green(`
      Successfully set up esp32 platform support for moddable!
      Test out the setup by plugging in your device and running: ./xs-dev.mjs test --device=esp32
      If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the "/dev.cu.*" that matches your device.
    `)
    );
    process.exit(0);
  }

  if (argv.device === "esp8266") {
    console.log(chalk.blue("Setting up ESP8266 SDK"));
    const TOOLCHAIN =
      "https://www.moddable.com/private/esp8266.toolchain.darwin.tgz";
    const ARDUINO_CORE =
      "https://github.com/esp8266/Arduino/releases/download/2.3.0/esp8266-2.3.0.zip";
    const ESP_RTOS_REPO = "https://github.com/espressif/ESP8266_RTOS_SDK.git";
    const ESP_BRANCH = "release/v3.2";
    const ESP_DIR = path.resolve(process.env.HOME, "esp");
    const RTOS_PATH = path.resolve(ESP_DIR, "ESP8266_RTOS_SDK");

    // 1. ensure ~/.local/share/esp directory
    console.log(chalk.blue("Ensuring esp directory"));
    await fs.ensureDir(ESP_DIR);

    cd(ESP_DIR);
    // 3. download and untar xtensa toolchain
    if (!(await fs.pathExists(path.resolve(ESP_DIR, "toolchain")))) {
      console.log(chalk.blue("Downloading xtensa toolchain"));
      await exec`wget --show-progress -nc ${TOOLCHAIN}`;
      await exec`tar -xvf esp8266.toolchain.darwin.tgz`;
    }

    // 4. download and unzip esp8266 core for arduino
    if (!(await fs.pathExists(path.resolve(ESP_DIR, "esp8266-2.3.0")))) {
      console.log(chalk.blue("Downloading esp8266 core for arduino"));
      await exec`wget --show-progress -nc ${ARDUINO_CORE}`;
      await exec`unzip esp8266-2.3.0.zip`;
    }

    // 5. clone esp8266 RTOS SDK
    if (!(await fs.pathExists(RTOS_PATH))) {
      console.log(chalk.blue("Cloning esp8266 RTOS SDK repo"));
      await exec`git clone -b ${ESP_BRANCH} ${ESP_RTOS_REPO} ${RTOS_PATH}`;
    }

    // 6. ensure python, pip, and pyserial are installed
    console.log(chalk.blue("Installing / upgrading homebrew dependencies"));
    await exec`brew install python; brew upgrade python`.pipe(process.stdout);

    if (!(await exec`which pip`)) {
      console.log(chalk.blue("Installing pip"));
      await exec`sudo easy_install pip`.pipe(process.stdout);
    }

    console.log(chalk.blue("Installing pyserial"));
    await exec`python -m pip install pyserial`.pipe(process.stdout);

    console.log(
      chalk.green(`
      Successfully set up esp8266 platform support for moddable!
      Test out the setup by plugging in your device and running: ./xs-dev.mjs test --device=esp8266
      If there is trouble finding the correct port, pass the "--port" flag to the above command with the path to the "/dev.cu.*" that matches your device.
    `)
    );
    process.exit(0);
  }

  // 0. ensure xcode command line tools are available (?)
  if (!(await exec`xcode-select -p`)) {
    console.error(
      chalk.red(
        "Xcode command line tools are required to build SDK: https://developer.apple.com/xcode/"
      )
    );
    process.exit(1);
  }

  // 1. clone moddable repo into ./local/share directory if it does not exist yet
  try {
    await fs.ensureDir(INSTALL_DIR);
  } catch (error) {
    console.error(chalk.red("Error setting up install directory: ", error));
    process.exit(1);
  }

  if (await fs.pathExists(INSTALL_PATH)) {
    console.log(chalk.blue("Moddable repo already installed"));
  } else {
    try {
      await exec`git clone ${MODDABLE_REPO} ${INSTALL_PATH}`;
    } catch (error) {
      console.log(chalk.red("Error cloning moddable repo: "), error);
      process.exit(1);
    }
  }

  // 2. configure MODDABLE env variable, add release binaries dir to PATH
  if (!process.env.MODDABLE) {
    process.env.MODDABLE = INSTALL_PATH;
    process.env.PATH += BIN_PATH;

    await appendToProfile(`export MODDABLE=${process.env.MODDABLE}`);
    await appendToProfile(`export PATH="${BIN_PATH}:$PATH"`);
  }

  // 3. cd into makefiles dir for platform, run `make`
  cd(path.resolve(INSTALL_PATH, "build", "makefiles", "mac"));
  await exec`make`.pipe(process.stdout);

  // 4. symlink xsbug.app into user applications directory
  try {
    await fs.ensureSymlink(
      path.resolve(INSTALL_PATH, "build", "bin", "mac", "release", "xsbug.app"),
      "/Applications/xsbug.app"
    );
  } catch (error) {
    console.log(chalk.red("Issue creating symlink for xsbug.app: ", error));
    process.exit(1);
  }

  console.log(
    chalk.green(`
    Moddable SDK successfully set up! Start the xsbug.app and run the "helloworld example": ./xs-dev.mjs test'
  `)
  );
}
