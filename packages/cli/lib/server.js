const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const { IpFilter, IpDeniedError } = require("express-ipfilter");
const socketIo = require("socket.io");
const helmet = require("helmet");
const esm = require("esm");
const esmRequire = esm(module);


function resolveApp(...p) {
  return path.resolve(process.cwd(), ...p);
}

// returns array of absolute paths to child directories within parentDir
function readChildDirs(parentDir) {
  return fs.existsSync(parentDir) ?
    fs.readdirSync(parentDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.resolve(parentDir, dirent.name))
    : []
}

// returns object of { [helper]: { path: string, helper?: object } }
function collectNodeHelpers(paths) {
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
        path: nodeHelperPath,
        helper: null // helper property will be added when the helper is started
      };
    }
  }
  return nodeHelpers;
}

class Server {
  /**
   *
   * @param {*} config
   * @param {*} openAppWindow
   */
  constructor(config, openAppWindow = false) {
    // Initialize the express app
    const app = express();
    const server = http.Server(app);
    const io = socketIo(server);
    // Only allow whitelisted IP addresses
    if (config.ipWhitelist.length) {
      app.use(IpFilter(config.ipWhitelist, { mode: "deny", log: false }));
    }
    // Add various security measures
    app.use(helmet());
    // Serve client-side files
    app.use(express.urlencoded({ extended: true }));
    for (const directory of ["css", "fonts", "modules", "vendor", "translations"]) {
      const dirpath = resolveApp(directory);
      if (fs.existsSync(dirpath)) {
        app.get(`/${directory}`, express.static(dirpath));
      }
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

    /**
     * The app's configuration
     */
    this.config = config;
    /**
     * The app's Express instance
     */
    this.app = app;
    /**
     * The http server
     */
    this.server = server;
    /**
     * The socket.io instance
     */
    this.io = io;
    /**
     * A map of module => { path, helper }
     */
    this.nodeHelpers = {};
  }

  addNodeHelpers() {
    this.nodeHelpers = collectNodeHelpers(this.paths);
    // Use "_" namespace for special things like starting node helpers
    const ioCore = this.io.of("_");
    ioCore.on("startHelper", helperName => {
      // Start helper if not already started
      if (this.nodeHelpers[helperName]) {
        if (!this.nodeHelpers[helperName].helper) {
          // Load helper with esm for ES6 import/export
          const Helper = esmRequire(this.nodeHelpers[helperName].path);
          const helper = new Helper();
          this.nodeHelpers[helperName].helper = helper;
          helper.setName(helperName);
          helper.setPath(this.nodeHelpers[helperName].path);
          helper.setExpressApp(this.app);
          helper.setSocketIO(this.io);
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
      if (this.nodeHelpers[helperName] && this.nodeHelpers[helperName].helper) {
        const helper = this.nodeHelpers[helperName].helper;
        helper.stop();
        this.nodeHelpers[helperName].helper = null;
      }
    })


  }

  listen() {
    this.server.listen(this.port, this.config.address || null);
  }

  stop() {
    Object.values(this.nodeHelpers).forEach(nh => nh.helper && nh.helper.stop());
    return new Promise((resolve, reject) => this.server.close(err => err ? reject(err) : resolve));
  }

  get port() {
    return this.config.port;
  }
}

function addNodeHelpers(app, { paths }) {
  let nodeHelpers = collectNodeHelpers(paths);
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
      nodeHelpers[helperName].helper = null;
    }
  })

  process.on("SIGINT", () => {
    setTimeout(() => process.exit(0), 3000);
    Object.values(nodeHelpers).forEach(nh => nh.helper && nh.helper.stop());
    process.exit(0);
  });
}

function createApp(config) {
  // Initialize the express app
  const app = express();
  const server = http.Server(app);
  const io = socketIo(server);
  app.set("io", io); // access io object with app.get("io")
  // Only allow whitelisted IP addresses
  if (config.ipWhitelist.length) {
    app.use(IpFilter(config.ipWhitelist, { mode: "deny", log: false }));
  }
  // Add various security measures
  app.use(helmet());
  // Serve client-side files
  app.use(express.urlencoded({ extended: true }));
  for (const directory of ["css", "fonts", "modules", "vendor", "translations"]) {
    if (fs.existsSync(resolveApp(directory))) {
      app.get(`/${directory}`, express.static(resolveApp(directory)));
    }
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

  server.listen(config.port, config.address || null);

  return app;
}

module.exports = {
  addNodeHelpers,
  createApp,
  Server
}