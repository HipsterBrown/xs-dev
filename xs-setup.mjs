#!/usr/bin/env zx

const MODDABLE_REPO = "https://github.com/Moddable-OpenSource/moddable";
const HOME_DIR = os.homedir();
const INSTALL_DIR = path.resolve(HOME_DIR, ".local", "share");
const INSTALL_PATH = path.resolve(INSTALL_DIR, "moddable");
const BIN_PATH = path.resolve(INSTALL_PATH, "build", "bin", "mac", "release");
const exec = $;

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
  // TODO: figure out how to do this safely, maybe use `nothrow` and check exit code
  // const BREW_DEPS = ["python3", "cmake", "ninja", "dfu-util"];
  console.log(chalk.blue("Installing / upgrading homebrew dependencies"));
  await exec`arch -arm64 brew install python3; arch -arm64 brew upgrade python3`.pipe(
    process.stdout
  );
  await exec`arch -arm64 brew install cmake; arch -arm64 brew upgrade cmake`.pipe(
    process.stdout
  );
  await exec`arch -arm64 brew install ninja; arch -arm64 brew upgrade ninja`.pipe(
    process.stdout
  );
  await exec`arch -arm64 brew install dfu-util; arch -arm64 brew upgrade dfu-util`.pipe(
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
    chalk.green("Successfully set up esp32 platform support for moddable!")
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
  Moddable SDK successfully set up! Start the xsbug.app and run the "helloworld example": 'cd $MODDABLE/examples/helloworld && mcconfig -d -m -p mac'
`)
);
