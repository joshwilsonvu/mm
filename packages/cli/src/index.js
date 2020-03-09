const path = require("path");
const fs = require("fs");
const http = require("http");
const chalk = require("chalk");
const socketIo = require("socket.io");
const express = require("express");
const helmet = require("helmet");
const { IpFilter, IpDeniedError } = require("express-ipfilter");
const Bundler = require("parcel-bundler");
const esm = require("esm");
const esmRequire = esm(module);

const paths = {
  cwd: resolveApp("."),
  appModules: resolveApp("modules"),
  appModulesDefault: resolveApp("modules", "default"),
  appBuild: resolveApp("build"),
  appConfigJs: process.env.MM_CONFIG_FILE || resolveApp("config", "config.js"),
  appIndexHtml: resolveApp("index.html"),
};

module.exports = class Scripts {
  constructor(argv) {
    this.argv = argv;
    // Load the config with defaults and package.json, skipping babel transform
    let config = Object.assign({}, defaults, esmRequire(paths.appConfigJs));
    config.port = process.env.MM_PORT || config.port;
    config.address = config.address || null;
    checkDeprecatedConfig(config);
    this.config = config;
  }

  /**
   * Run MagicMirror, with watching and reloading
   */
  dev() {
    let app = createApp(this.config);
    addNodeHelpers(app);

    console.log("Starting server on port " + this.config.port + " ... ");
    if (Array.isArray(this.config.ipWhitelist) && this.config.ipWhitelist.length === 0) {
      console.info("You're using a full whitelist configuration to allow for all IPs");
    }

    // Serve the client bundle in development mode, watching for changes
    const bundler = new Bundler(paths.appIndexHtml, {
      outDir: paths.appBuild,
      target: "browser",
      watch: true,
      logLevel: 2
    });
    app.use(bundler.middleware());
  }

  build() {
    // Build the client bundle once in production mode,
    // or use whatever is in the build folder if there is no source code
    const bundler = new Bundler(paths.appIndexHtml, {
      outDir: paths.appBuild,
      target: "browser",
      watch: false,
      logLevel: 2
    });
    bundler.on("bundled", () => {
      console.log("Built MagicMirror.");
      process.exit(0);
    });
    bundler.on("buildError", e => {
      console.error(e);
      process.exit(1);
    });
    bundler.bundle();
  }

  serve() {
    const clientonly = this.argv.clientonly, serveronly = this.argv.serveronly;
  }
}


function createApp(config) {
  // Initialize the express app
  const app = express();
  const server = http.Server(app);
  const io = socketIo(server);
  app.set("io", io); // access io object with app.get("io")
  // Only allow whitelisted IP addresses
  app.use(IpFilter(config.ipWhitelist, { mode: config.ipWhitelist.length ? "deny" : "allow", log: false }));
  // Add various security measures
  app.use(helmet());
  // Serve client-side files
  app.use(express.urlencoded({ extended: true }));
  for (const directory of ["/css", "/fonts", "/modules", "/vendor", "/translations"]) {
    app.get(directory, express.static(resolveApp(directory)));
  }

  // Add stubs for compatibility
  app.get("/version", (req, res) => res.send("0.0.0"));
  app.get("/config", (req, res) => res.send({}));

  // Error handler, for when a device not on the ipWhitelist tries to access
  app.use(function (err, req, res, next) {
    if (err instanceof IpDeniedError) {
      console.log(err.message);
      res.status(403).send("This device is not allowed to access your mirror. <br> Please check your config.js to change this.");
    } else {
      next(err);
    }
  });

  server.listen(config.port, config.address ? config.address : null);

  return app;
}

function addNodeHelpers(app) {
  let nodeHelpers = collectNodeHelpers();
  // Use "_core" namespace for special things like starting node helpers
  const ioCore = app.get("io").of("_core");
  ioCore.on("startHelper", helperName => {
    // Start helper if not already started
    if (nodeHelpers[helperName]) {
      if (!nodeHelpers[helperName].helper) {
        // Load helper with esm for ES6 import/export
        const Helper = esmRequire(nodeHelpers[helperName].path);
        const helper = new Helper();
        nodeHelpers[helperName].helper = helper;
        helper.setName(helperName);
        helper.setPath(nodeHelpers[helperName].path);
        helper.setExpressApp(app);
        helper.setSocketIO(app.get("io"));
        if (helper.loaded) {
          helper.loaded(() => helper.start());
        } else {
          helper.start();
        }
      }
    } else {
      console.log(`No helper found for module ${helperName}.`);
    }
  });
  ioCore.on("stopHelper", (helperName) => {
    // Stop helper if already started
    if (nodeHelpers[helperName] && nodeHelpers[helperName].helper) {
      const helper = nodeHelpers[helperName].helper;
      helper.stop();
      delete nodeHelpers[helperName].helper;
    }
  })

  process.on("SIGINT", () => {
    console.log("Shutting down gracefully...");
    setTimeout(() => process.exit(0), 3000);
    Object.values(nodeHelpers).forEach(nh => nh.helper && nh.helper.stop());
    process.exit(0);
  });
}

function resolveApp(...p) {
  return path.resolve(process.cwd(), ...p);
}

// returns array of absolute paths to child directories within parentDir
function readChildDirs(parentDir) {
  return fs.existsSync(parentDir) ?
    fs.readdirSync(parentDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(parentDir, dirent.name))
    : []
}

// returns object of { [helper]: { path: string, helper?: object } }
function collectNodeHelpers() {
  // Collect all modules dirs except default/, and all modules within default/
  const moduleDirs = readChildDirs(paths.appModules)
    .filter(dir => dir === paths.appModulesDefault)
    .concat(readChildDirs(paths.appModulesDefault));
  let nodeHelpers = {};

  for (const moduleDir of moduleDirs) {
    const moduleName = moduleDir.slice(moduleDir.lastIndexOf(path.sep) + 1);
    const nodeHelperPath = path.resolve(moduleDir, `node_helper.js`);
    if (fs.existsSync(nodeHelperPath)) {
      nodeHelpers[moduleName] = {
        path: nodeHelperPath
        // helper property will be added when the helper is started
      };
    }
  }
  return nodeHelpers;
}

function checkDeprecatedConfig(config) { }

const defaults = {
  address: "localhost",
  port: 8080,
  kioskmode: false,
  electronOptions: {},
  ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],

  language: "en",
  timeFormat: 24,
  units: "metric",
  zoom: 1,
  customCss: "css/custom.css",
};

