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
    url = await getUrl(moduleName);
  }
  if (!url) return 1;

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
    `Open ${chalk.underline(
      paths.config
    )} to add ${moduleName} to your config file. ex:
    {
      module: "${moduleName}",
      position: " ... ",
      config: { ... }
    }`
  );
};

const ghUsernameRegex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const moduleRegex = /^[a-z][_a-z0-9-]*$/i;

async function getUrl(moduleName) {
  const prompts = require("prompts");
  const fetch = require("node-fetch");
  // Find the desired repository and clone it into the modules folder
  const json = await fetch(
    `https://api.github.com/search/repositories?page=1&per_page=3&sort=stars&q=${encodeURIComponent(
      moduleName
    )}`
  ).then((res) => res.json());
  if (!Array.isArray(json.items)) {
    return null;
  }
  const items = json.items
    .map((i) => ({
      clone_url: i.clone_url,
      full_name: i.full_name,
      stars: i.stargazers_count,
    }))
    .slice(0, 3);
  if (items.length <= 1) {
    return items[0] || null;
  }
  const { choice } = await prompts([
    {
      type: "select",
      name: "choice",
      message: `Did you mean one of these?`,
      choices: items.map((i) => ({
        title: `${i.full_name} (${i.stars} stars)`,
      })),
    },
  ]);
  return items[choice] ? items[choice].clone_url : null;
}
