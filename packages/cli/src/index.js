const defaults = require("./defaults");
const path = require("path");
const fs = require("fs");
const http = require("http");
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
  appConfigJs: process.env.MM_CONFIG_FILE || resolveApp("config", "config.js"),
  appPackageJson: resolveApp("package.json"),
  appIndexJs: resolveApp("src", "index.js"),
};

// Load the config with defaults and package.json
const config = Object.assign({}, defaults, require(paths.appConfigJs));
config.port = process.env.MM_PORT || config.port;
config.address = config.address || null;
checkDeprecatedConfig(config);

// Collect all modules dirs except default/, and all modules within default/
const moduleDirs = readChildDirs(paths.appModules)
  .filter(dir => dir === paths.appModulesDefault)
  .concat(readChildDirs(paths.appModulesDefault));

// Collect all of the node_helper.js paths
let nodeHelpers = collectNodeHelpers();



// Initialize the express app
const app = express();
const server = http.Server(app);
const io = socketIo(server);
app.set("io", io); // access io object with app.get("io")

// Add all express middlewares
configureApp(app);
// TODO: on requests to start Node Helpers from the client, import nodeHelpers[moduleName] with esmLoader()
console.log("Starting server on port " + config.port + " ... ");
server.listen(config.port, config.address ? config.address : null);

if (Array.isArray(config.ipWhitelist) && config.ipWhitelist.length === 0) {
  console.info("You're using a full whitelist configuration to allow for all IPs");
}









function configureApp(app) {
  // Only allow whitelisted IP addresses
  app.use(IpFilter(config.ipWhitelist, { mode: config.ipWhitelist.length ? "deny" : "allow", log: false }));
  // Add various security measures
  app.use(helmet());
  // Serve all of the client-side files built with Parcel
  app.use(express.urlencoded(), { extended: true });
  app.get("/build", express.static(__dirname));
  for (const directory of ["/config", "/css", "/fonts", "/modules", "/vendor", "/translations", "/tests/configs"]) {
    app.get(directory, express.static(path.resolve(global.root_path + directory)));
  }

  app.get("/version", (req, res) => {
    res.send(require("../package.json").version); // is CLI version necessary? 
  });

  // app config will already be in client bundle, pointless to include
  // app.get("/config", (req,res) => res.send(config));

  if (process.env.NODE_ENV === "production") {
    // Build the client bundle once in production mode, 
    // or use whatever is in the build folder if there is no source code
    if (fs.existsSync(paths.appIndexHtml)) {
      const bundler = new Bundler(paths.appIndexHtml, {
        outDir: paths.appBuild,
        target: "browser",
        watch: false,
      });
      bundler.bundle();
      bundler.on("bundled", () => console.log("Now serving MagicMirror."));
    }
    app.use(express.static(paths.appBuild)); // serve it
  } else {
    // Serve the client bundle in development mode, watching for changes
    process.env.NODE_ENV = "development";
    const bundler = new Bundler(paths.appIndexHtml, {
      outDir: paths.appBuild,
      target: "browser",
      watch: true,
    });
    app.use(bundler.middleware());
  }

  // Use "_core" namespace for special things like starting node helpers
  const ioCore = app.get("io").of("_core");
  ioCore.on("startHelper", (helperName) => {
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
        helper.loaded
          ? helper.loaded(() => helper.start())
          : helper.start();
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

  // Error handler, for when a device not on the ipWhitelist tries to access
  app.use(function (err, req, res, next) {
    if (err instanceof IpDeniedError) {
      console.log(err.message);
      res.status(403).send("This device is not allowed to access your mirror. <br> Please check your config.js to change this.");
    } else {
      next(err);
    }
  });
}

// find all of the node_helper.js files in the modules
function resolveApp(...p) {
  return path.resolve(process.cwd(), ...p);
}

// returns array of absolute paths to child directories within parentDir
function readChildDirs(parentDir) {
  return fs.readdirSync(parentDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(parentDir, dirent.name))
}

// returns object of { [helper]: "path/" }
function collectNodeHelpers() {
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
