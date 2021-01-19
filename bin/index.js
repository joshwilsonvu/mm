#!/usr/bin/env node

require("dotenv").config(); // loads environment variables from .env file
const { Cli, Command } = require("clipanion");
const { startServer, createConfiguration, logger } = require("snowpack");

// Default to development mode
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

function createContext() {
  let _server = null;
  async function getServer() {
    if (_server) {
      return _server;
    }
    const [err, snowpackConfig] = createConfiguration({
      exclude: ["__tests__/**/*", "**/node_modules/**/*"],
      devOptions: {
        open: "none",
        port: config.port + 1, // leave config.port open for MagicMirror server
        hostname: config.address,
        hmrDelay: 750,
      },
      packageOptions: {
        source: "local",
        env: {
          NODE_ENV: true,
        },
        polyfillNode: false,
      },
      plugins: [
        [
          require.resolve("@snowpack/plugin-babel"),
          { transformOptions: require("./shared/babel").config },
        ],
        // require.resolve("../shared/lint-plugin"),
      ],
      mount: {
        public: "/",
        src: "/src",
        config: "/config",
        modules: "/modules",
      },
    });
    if (err) throw err;
    _server = await startServer({
      config: snowpackConfig,
    });
    return _server;
  }

  let _runtime = null;
  async function getRuntime() {
    if (_runtime) {
      return _runtime;
    }
    const server = await getServer();
    _runtime = server.getServerRuntime();
    return _runtime;
  }

  let _paths = null;
  function getPaths() {
    if (_paths) {
      return _paths;
    }
    const path = require("path");
    const resolve = require("resolve");
    const extensions = [".js", ".ts", ".tsx", ".jsx", ".mjs"];
    const cwd = process.cwd();

    const resolveUnqualified = (p) =>
      resolve.sync(p, {
        basedir: cwd,
        extensions,
      });

    const config = resolveUnqualified("./config/config");
    if (!config) {
      throw new Error(
        `Can't find a config file at ${path.resolve(
          "config",
          "config"
        )}${extensions.join("|")}.`
      );
    }
    const index = resolveUnqualified("./src/index");
    if (!config || !index) {
      throw new Error(
        `Can't find an index file at ${path.resolve(
          "src",
          "index"
        )}${extensions.join("|")}.`
      );
    }

    _paths = {
      cwd: cwd,
      modules: path.resolve("modules"),
      modulesDefault: path.resolve("modules", "default"),
      config,
      src: path.resolve("src"),
      index,
      packageJson: path.resolve("package.json"),
      tsConfig: path.resolve("tsconfig.json"),
      extensions,
      resolveUnqualified,
    };
    return _paths;
  }

  let _config = null;
  async function getConfig() {
    if (_config) {
      return _config;
    }
    const server = await getServer();
    const runtime = await getRuntime();
    const paths = getPaths();
    const configUrl = server.getUrlForFile(paths.config);

    const { initializeConfig } = require("../dist/types.js");
    _config = initializeConfig(
      (await runtime.importModule(configUrl)).exports.default
    );
    return _config;
  }

  let _modules;
  function getModules() {
    if (_modules) {
      return _modules;
    }
    const paths = getPaths();

    // Collect all modules dirs except default/, and all modules within default/.
    const moduleDirs = fs
      .readdirSync(paths.modules, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => path.join(paths.modules, dirent.name))
      .filter((p) => p !== paths.modulesDefault);
    const defaultModuleDirs = fs
      .readdirSync(paths.modulesDefault, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => path.join(paths.modulesDefault, dirent.name));

    // Return a map of module names to absolute module directories and important
    // files within those directories
    _modules = defaultModuleDirs.concat(moduleDirs).reduce((modules, dir) => {
      const moduleName = path.basename(dir);
      modules[moduleName] = {
        dir,
        index:
          paths.resolveUnqualified(dir) || // index.js, .ts, etc.
          paths.resolveUnqualified(path.join(dir, moduleName)), // MM2-style, use name of folder as entry
        helper:
          paths.resolveUnqualified(path.join(dir, "node_helper")) ||
          paths.resolveUnqualified(path.join(dir, "node-helper")), // handle typos
      };
      return modules;
    }, {});
    return _modules;
  }

  const context = {
    getServer,
    getRuntime,
    getPaths,
    getConfig,
    getModules,
  };
  return context;
}

// const symbols = require("log-symbols");
// const format = require("util").format;

// Add some decoration to console methods
// console.info = (...args) => console.log(`${symbols.info} ${format(...args)}`);
// console.success = (...args) =>
//   console.log(`${symbols.success} ${format(...args)}`);
// console.warn = (...args) =>
//   console.log(`${symbols.warning} ${format(...args)}`);
// console.error = (...args) => console.log(`${symbols.error} ${format(...args)}`);
// if (process.env.MM_DEBUG && process.env.MM_DEBUG !== "false") {
//   console.debug = (...args) => console.log(`[DEBUG] ${format(...args)}`);
//   console.debug("Environment variable MM_DEBUG is set; showing debug logs.");
// } else {
//   console.debug = () => {};
// }

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
    ...createContext(),
  })
  .then((code) => {
    process.exitCode = code;
    setTimeout(() => process.exit(), 2000).unref();
  });
