const path = require("path");
const { createRequire } = require("module");
const cwd = process.cwd();

const cwdRequire = createRequire(path.resolve("package.json"));

const extensions = [".js", ".ts", ".tsx", ".jsx", ".mjs"];

const paths = {
  cwd: cwd,
  modules: path.resolve("modules"),
  modulesDefault: path.resolve("modules", "default"),
  config: resolveUnqualified("./config/config"),
  src: path.resolve("src"),
  index: resolveUnqualified("./src/index"),
  packageJson: path.resolve("package.json"),
  tsConfig: path.resolve("tsconfig.json"),
  extensions,
};

module.exports = paths;

function resolveUnqualified(p) {
  let e;
  for (const ext of [""].concat(extensions)) {
    const rel = p + ext;
    try {
      return cwdRequire.resolve(rel);
    } catch (err) {
      e = err;
    }
  }
  throw e;
}
