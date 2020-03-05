const defaults = require("./defaults");
const path = require("path");
const fs = require("fs");
const express = require("express");
const esm = require("esm");
const esmRequire = esm(module);

// find all of the node_helper.js files in the modules
function resolveApp(...p) {
  return path.resolve(process.cwd(), ...p);
}
const paths = {
  cwd: resolveApp("."),
  appModules: resolveApp("modules"),
  appModulesDefault: resolveApp("modules", "default"),
  appConfigJs: resolveApp("config", "config.js"),
}

// returns array of absolute paths to child directories within parentDir
function readChildDirs(parentDir) {
  return fs.readdirSync(parentDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(parentDir, dirent.name))
}

// Collect all modules dirs except default/, and all modules within default/
const moduleDirs = readChildDirs(paths.appModules)
  .filter(dir => dir === paths.appModulesDefault)
  .concat(readChildDirs(paths.appModulesDefault));

// Load the config
const config = require(paths.appConfigJs);


// Collect all of the node_helper.js paths
let nodeHelpers = {};
for (const moduleDir of moduleDirs) {
  const moduleName = moduleDir.slice(moduleDir.lastIndexOf(path.sep) + 1);
  console.log(`Requiring module ${moduleDir}.`);
  const nodeHelperPath = path.join(moduleDir, `node_helper.js`);
  if (fs.existsSync(nodeHelperPath)) {
    nodeHelpers[moduleName] = nodeHelperPath;
  }
}

// TODO: on requests to start Node Helpers from the client, import nodeHelpers[moduleName] with esmLoader()

// Initialize the express app
const app = express();













function checkDeprecatedConfig() {}


