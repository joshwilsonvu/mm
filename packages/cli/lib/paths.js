const path = require("path");

// Resolve a file or directory relative to the current working directory (typically ~/MagicMirror)
function resolveApp(...p) {
  return path.resolve(process.cwd(), ...p);
}

const paths = {
  get cwd() { return resolveApp(".") },
  get appModules() { return resolveApp("modules") },
  get appModulesDefault() { return resolveApp("modules", "default") },
  get appBuild() { return resolveApp("build") },
  get appConfigJs() { return process.env.MM_CONFIG_FILE || resolveApp("config", "config.js") },
  get appIndexHtml() { return resolveApp("index.html") },
};

module.exports = paths;