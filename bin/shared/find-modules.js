const fs = require("fs");
const path = require("path");
const paths = require("./paths");

// returns array of absolute paths to child directories within parentDir
function readChildDirs(parentDir) {
  return fs.existsSync(parentDir)
    ? fs
        .readdirSync(parentDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => path.resolve(parentDir, dirent.name))
    : [];
}

// Collect all modules dirs except default/, and all modules within default/
module.exports = function findModules({ defaults = true } = {}) {
  let modules = readChildDirs(paths.modules).filter(
    (dir) => dir !== paths.modulesDefault
  );
  if (defaults) {
    modules.push(...readChildDirs(paths.modulesDefault));
  }
  return modules;
};
