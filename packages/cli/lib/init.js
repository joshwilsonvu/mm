const fs = require("fs-extra");
const simpleGit = require("simple-git/promise");
const path = require("path");
const execa = require("execa");
const latestVersion = require("latest-version");
const chalk = require("chalk");

const repoUrl = "joshwilsonvu/MagicMirror";

module.exports = init;

async function init() {
  try {
    this.preflightCheck([
      this.paths.appModules,
      this.paths.appConfigJs,
      this.paths.appIndexHtml
    ])
  } catch (_) {
    // This doesn't look like a MagicMirror repository--
  }

  this.paths.appPackageJson = path.resolve("package.json");
  if (!(await fs.pathExists(this.paths.appPackageJson))) {
    // Initialize the repository with yarn init, will throw if cancelled or yarn is not installed
    try {
      await execa("yarn", ["init", "-y"], { stdout: "inherit", stderr: "inherit", stdin: "inherit" });
    } catch (err) {
      if (err.code === "ENOENT") {
        throw new Error("yarn is not installed. Please follow the instructions at https://classic.yarnpkg.com/en/docs/install to install it.");
      }
      throw err;
    }
  }

  // First, check if this is already a MagicMirror repo
  const checks = await Promise.all(
    [
      this.paths.appModules,
      this.paths.appConfigJs,
    ].map(path => fs.pathExists(path))
  );
  if (checks.every(Boolean)) {
    // this looks like an MM2 repo

    // later, automatically import this css
    this.paths.customCss = path.resolve("css", "custom.css");
  }

  const packageJson = await fs.readJson(path.resolve("package.json"))
  Object.assign(packageJson, {
    "private": true,
    "workspaces": [
      "modules/*",
      "!modules/default",
      "modules/default/*",
    ],
  });
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  Object.assign(packageJson.scripts, {
    "dev": "mm dev",
    "build": "mm build",
    "serve": "mm serve"
  });
  if (!packageJson.dependencies) {
    packageJson.dependencies = {};
  }
  const versions = await Promise.all(
    ["@mm/cli", "@mm/core", "@mm/hooks", "@mm/mm2"]
      .filter(pkg => !packageJson.dependencies.hasOwnProperty(pkg))
      .map(async pkg => [pkg, `^${await latestVersion(pkg)}`])
  );
  for (const [pkg, version] of versions) {
    packageJson.dependencies[pkg] = version;
  }
  await fs.outputJson(path.resolve("package.json"), packageJson, { spaces: 2 });
  await Promise.all([
    fs.ensureDir(this.paths.appModules),
    fs.ensureDir(this.paths.appModulesDefault),
    fs.outputFile(this.paths.appConfigJs, configJsTemplate),
    fs.outputFile(this.paths.appIndexHtml, indexHtmlTemplate),
  ])
  // ...
  await execa("yarn", [], { stdout: "inherit", stderr: "inherit" });

  console.log(`\n${chalk.bold.green("MagicMirror has been installed successfully.")}\n`);
  console.log([
    `The ${chalk.cyan("mm")} command provides several useful features.`,
    `For example, running ${chalk.cyan("yarn mm dev")} will automatically update your mirror`,
    `as you change the config file or other files.`,
    `You can view all of the features at any time with ${chalk.cyan("yarn mm --help")}:`
  ].join("\n"));
  await execa("yarn", ["mm", "--help"], { stdout: "inherit", stderr: "inherit" });
}

// Make sure that either the repository is already cloned from MagicMirror (or appears to be)
// or if the directory is completely empty, clone MagicMirror into this directory
async function checkGit(paths) {
  if (
    await fs.pathExists(path.resolve(".git"))
    && await fs.pathExists(paths.appModulesDefault)
    && (await fs.readdir(paths.appModulesDefault)).length > 0
  ) {
    // this directory looks like a cloned MagicMirror; nothing to do
    return true;
  }

  // Otherwise, if this is a fresh yarn project with no source code, clone into this directory
  if (contains(
    ["package.json", "yarn.lock", "node_modules", ".yarn", ".pnp.js", ".gitignore"],
    await fs.readdir(path.resolve("."))
  )) {
    const git = simpleGit(paths.cwd);
    await git.init()
    await git.addRemote('origin', repoUrl)
    await git.stash()
    await git.pull("origin", "master")
    await git.stash(["pop"])
    return true;
  }
}

function contains(all, some) {
  all = new Set(all);
  some = new Set(some);
  if (some.size > all.size) {
    return false;
  }
  for (const el of some) {
    if (!all.has(el)) {
      return false;
    }
  }
  return true;
}