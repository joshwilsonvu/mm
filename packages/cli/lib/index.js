#!/usr/bin/env node

require("dotenv").config(); // loads environment variables from .env file
const { Cli, Command } = require("clipanion");
const path = require("path");
const resolve = require("resolve");
const memoize = require("fast-memoize");
const symbols = require("log-symbols");
const format = require("util").format;

// Add some decoration to console methods
console.info = (...args) => console.log(`${symbols.info} ${format(...args)}`);
console.success = (...args) =>
  console.log(`${symbols.success} ${format(...args)}`);
console.warn = (...args) =>
  console.log(`${symbols.warning} ${format(...args)}`);
console.error = (...args) => console.log(`${symbols.error} ${format(...args)}`);
if (process.env.MM_DEBUG && process.env.MM_DEBUG !== "false") {
  console.debug = (...args) => console.log(`[DEBUG] ${format(...args)}`);
  console.debug("Environment variable MM_DEBUG is set; showing debug logs.");
} else {
  console.debug = () => {};
}

// Default to development mode
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

const extensions = [".mjs", ".js", ".ts", ".tsx", ".json", ".jsx"];

const cwd = process.cwd();
// Try to resolve an extensioned or extensionless, relative or absolute, posix or windows path
function resolveExtensions(p) {
  try {
    const relative =
      "./" + path.relative(cwd, path.resolve(cwd, p)).replace("\\", "/");
    return resolve.sync(relative, {
      extensions: extensions,
      basedir: cwd,
    });
  } catch (err) {
    return "";
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
    appIndexHtml: path.resolve("src/index.html"),
    appPackageJson: path.resolve("package.json"),
    appTsConfig: path.resolve("tsconfig.json"),
    appNodeModules: path.resolve("node_modules"), // be careful to only use this in Webpack options, so Yarn PnP works
    extensions: extensions,
  };
  if (!paths.appIndex) {
    console.fatal(
      `Couldn't find an entry file at '${path.resolve(
        "src",
        `index[${paths.extensions.join("|")}]`
      )}. `
    );
    return 1;
  }
  if (!paths.appConfig) {
    console.warn(
      `Couldn't find a config file at '${path.resolve(
        process.env.MM_CONFIG_FILE || path.join("config", "config")
      )}', using defaults.\n` +
        `Please create '${path.resolve(
          "config",
          "config.js"
        )}' or set MM_CONFIG_FILE to an existing config file.`
    );
  }
  // transpile server-side user files: MagicMirror config and module node helpers
  const { register } = require("./shared/babel-config");
  register(paths);
  console.debug("using paths:", paths);
  return paths;
});

const config = memoize(() => {
  let rawConfig = require(paths().appConfig);
  if (rawConfig.__esModule && rawConfig.default) {
    rawConfig = rawConfig.default;
  }
  const { initializeConfig } = require("@mm/core");
  const initializedConfig = initializeConfig(rawConfig);
  console.debug("loaded config:", initializedConfig);
  return initializedConfig;
});
const context = { paths, config };

const cli = new Cli({
  binaryLabel: "MagicMirror CLI",
  binaryName: "mm",
  binaryVersion: require("../package.json").version,
});

// Support the following commands
const commands = require("./commands");
for (const command of Object.values(commands)) {
  cli.register(command);
}
Command.Entries.Help.addPath(); // run help by default
cli.register(Command.Entries.Help);
cli.register(Command.Entries.Version);

cli
  .run(process.argv.slice(2), {
    ...Cli.defaultContext,
    ...context,
  })
  .then((code) => {
    process.exitCode = code;
    setTimeout(() => process.exit(), 2000).unref();
  });
