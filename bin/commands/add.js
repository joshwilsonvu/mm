"use strict";

const execa = require("execa");
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const paths = require("../shared/paths");

module.exports = async function () {
  // Check inputs and make sure Git is installed
  if (!this.moduleName) {
    console.error("No module provided");
    return 1;
  }
  let [ghUsername, moduleName] = this.moduleName.trim().split("/");
  if (!moduleName) {
    moduleName = ghUsername;
    ghUsername = "";
  }
  if (!moduleRegex.test(moduleName)) {
    console.error("Invalid module name %s.", moduleName);
    return 1;
  }
  if (ghUsername && !ghUsernameRegex.test(ghUsername)) {
    console.error("Invalid GitHub username %s.", ghUsername);
    return 1;
  }

  const modulePath = path.join(paths.modules, moduleName);
  if (await fs.pathExists(modulePath)) {
    console.info(`${moduleName} is already installed.`);
    console.debug(`${modulePath} exists.`);
    return 0;
  }

  try {
    await execa("git", ["--version"]);
  } catch (_) {
    console.error("Git is not installed; can't install a MagicMirror module.");
    return 1;
  }

  let url;
  if (ghUsername) {
    url = `https://github.com/${ghUsername}/${moduleName}.git`;
  } else {
    // TODO try to find module in moduleslist
    // url = getUrl(moduleName);
    // if (!url) {
    console.error(`No repository found for ${moduleName}. `);
    console.info(
      "Try " + chalk.cyan(`yarn mm add <github-username>/${moduleName}`)
    );
    return 1;
    // }
  }

  console.debug("Cloning", url);
  try {
    await execa("git", ["clone", url], {
      cwd: paths.modules,
      stdio: "inherit",
    });
  } catch (_) {
    console.error("Couldn't clone ", url);
    return 1;
  }
  const hasDeps = await fs.pathExists(path.join(modulePath, "package.json"));
  if (hasDeps) {
    console.debug("Running yarn");
    await execa("yarn", [], { cwd: paths.cwd, stdio: "inherit" });
  }

  console.log();
  console.success(
    `Installed module ${chalk.bold(moduleName)} at ${chalk.underline(
      modulePath
    )}.\n`
  );
  const humanUrl = url.endsWith(".git")
    ? url.substring(0, url.length - 4)
    : url;
  console.info(
    `mm has cloned the module${
      hasDeps ? "and installed its dependencies" : ""
    }. Check the README at ${chalk.underline(
      humanUrl
    )} to see if there are any other installation instructions.`
  );
  console.info(
    `Open ${chalk.underline(paths.config)} to add it to your config file.`
  );
};

const ghUsernameRegex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const moduleRegex = /^[a-z][_a-z0-9-]*$/i;

function getUrl(moduleName) {
  // Find the desired repository and clone it into the modules folder
  const moduleslist = require("@mm/moduleslist");
  const knownModule = moduleslist.find((m) => m.name === moduleName);
  if (knownModule) {
    console.debug(`Found module matching ${moduleName}:`, knownModule);
    return knownModule.repository;
  }
}
