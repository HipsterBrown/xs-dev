#!/usr/bin/env zx

const MODDABLE_REPO = "https://github.com/Moddable-OpenSource/moddable";
const HOME_DIR = os.homedir();
const INSTALL_DIR = path.resolve(HOME_DIR, ".local", "share");
const INSTALL_PATH = path.resolve(INSTALL_DIR, 'moddable');
const BIN_PATH = path.resolve(INSTALL_PATH, 'build', 'bin', 'mac', 'release')
const exec = $;

// 0. ensure xcode command line tools are available (?)

// 1. clone moddable repo into ./local/share directory if it does not exist yet
try {
  await fs.ensureDir(INSTALL_DIR);
} catch (error) {
  console.error(chalk.red("Error setting up install directory: ", error));
}

if (await fs.pathExists(INSTALL_PATH)) {
  console.log(chalk.blue("Moddable repo already installed"))
} else {
  try {
    await exec`git clone ${MODDABLE_REPO} ${INSTALL_PATH}`
  } catch (error) {
    console.log(chalk.red("Error cloning moddable repo: "), error)
  }
}

// 2. determine shell profile (i.e. .profile or .zshrc)
const PROFILE = await (async function () {
  const shell = process.env.SHELL || await exec`echo $0`;
  if (shell.includes('zsh')) return '.zshrc';
  return '.profile';
})()
const PROFILE_PATH = path.resolve(HOME_DIR, PROFILE);

await fs.ensureFile(PROFILE_PATH);
console.log(chalk.blue(`Using ${PROFILE} environment config`))

// 3. configure MODDABLE env variable, add release binaries dir to PATH
if (!process.env.MODDABLE) {
  process.env.MODDABLE = INSTALL_PATH
  process.env.PATH += BIN_PATH

  await exec`echo 'export MODDABLE=${process.env.MODDABLE}' >> ${PROFILE_PATH}`
  await exec`echo 'export PATH="${BIN_PATH}:$PATH"' >> ${PROFILE_PATH}`
}

// 4. cd into makefiles dir for platform, run `make`
cd(path.resolve(INSTALL_PATH, 'build', 'makefiles', 'mac'));
await exec`make`.pipe(process.stdout)

// 5. symlink xsbug.app into user applications directory
try {
  await fs.ensureSymlink(path.resolve(INSTALL_PATH, 'build', 'bin', 'mac', 'release', 'xsbug.app'), '/Applications/xsbug.app')
} catch (error) {
  console.log(chalk.red("Issue creating symlink for xsbug.app: ", error))
}
