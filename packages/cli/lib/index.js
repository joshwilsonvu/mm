#!/usr/bin/env node

const { Cli, Command } = require("clipanion");
const path = require("path");
const resolve = require("resolve");
const loadConfig = require("./shared/load-config");
const memoize = require("fast-memoize");
const consola = require("consola");

consola.wrapConsole(); // redirect `console.*` to consola
if (process.env.NODE_ENV === "test") {
  consola.setReporters(new consola.BasicReporter());
}
if (process.env.MM_LOG_LEVEL) {
  consola.level = process.env.MM_LOG_LEVEL;
}

// Default to development mode
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const extensions = ['.mjs', '.js', '.ts', '.tsx', '.json', '.jsx'];


const cwd = process.cwd();
// Try to resolve an extensioned or extensionless, relative or absolute, posix or windows path
const resolveExtensions = p => {
  const relative = "./" + path.relative(cwd, path.resolve(cwd, p)).replace("\\", "/");
  try {
    return resolve.sync(relative, {
      extensions: extensions,
      basedir: cwd,
    });
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      return "";
    } else {
      throw e;
    }
  }
}

const paths = memoize(() => {
  const paths = {
    cwd: cwd,
    appModules: path.resolve("modules"),
    appModulesDefault: path.resolve("modules", "default"),
    appBuild: path.resolve("build"),
    appConfig: resolveExtensions(process.env.MM_CONFIG_FILE || "config/config"),
    appIndex: resolveExtensions("src/index"),
    appIndexHtml: path.resolve("index.html"),
    appPackageJson: path.resolve("package.json"),
    appTsConfig: path.resolve("tsconfig.json"),
    appNodeModules: path.resolve("node_modules"), // be careful to only use this in Webpack options, so Yarn PnP works
    extensions: extensions,
    resolve: resolveExtensions,
  }
  if (!paths.appIndex) {
    console.fatal(`Couldn't find an entry file at '${path.resolve("src", `index.[${paths.extensions.join("|")}]`)}. `);
  }
  if (!paths.appConfig) {
    console.warn(`Couldn't find a config file at '${path.resolve(process.env.MM_CONFIG_FILE || path.join("config", "config"))}', using defaults.\n`
      + `Please create '${path.resolve("config", "config.js")}' or set MM_CONFIG_FILE to an existing config file.`);
  }
  // transpile server-side user files: MagicMirror config and module node helpers
  const { register } = require("./shared/babel-config");
  register(paths);
  return paths;
});

const config = memoize((overrides) => loadConfig(paths().appConfig, overrides));
const context = { paths, config };

const cli = new Cli({
  binaryLabel: "MagicMirror CLI",
  binaryName: "mm",
  binaryVersion: require("../package.json").version,
})

// Support the following commands
cli.register(require("./start"));
cli.register(require("./build"));
cli.register(require("./serve"));
cli.register(require("./view"));
Command.Entries.Help.addPath(); // run help by default
cli.register(Command.Entries.Help);
cli.register(Command.Entries.Version);

cli.run(process.argv.slice(2), {
  ...Cli.defaultContext,
  ...context,
}).then(code => {
  process.exit(code);
});
