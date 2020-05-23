'use strict';

const fs = require("fs-extra");
const path = require("path");
const http = require("http");
const express = require("express");
const SocketIo = require("socket.io");
const { IpFilter, IpDeniedError } = require("express-ipfilter");
const morgan = require("morgan");
const helmet = require("helmet");
const esm = require("esm");
const esmImport = esm(module);


/**
 *
 * @param {object} config
 * @param {object} paths
 * @param {function} middleware required to serve application html/js/css etc.
 */
module.exports = function Server(config, paths, middleware) {
  // Initialize the express app
  const app = express();
  const server = http.Server(app);
  const io = SocketIo(server);
  // Only allow whitelisted IP addresses
  if (config.ipWhitelist.length) {
    app.use(IpFilter(config.ipWhitelist, { mode: "deny", log: false }));
  }
  // Add logging
  if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
  }
  // Add various security measures
  app.use(helmet());
  // Serve client-side files
  app.use(express.urlencoded({ extended: true }));
  for (const directory of ["modules", "translations"]) {
    const dirpath = path.resolve(directory);
    if (fs.existsSync(dirpath)) {
      app.get(`/${directory}`, express.static(dirpath));
    }
  }

  // Add stubs for compatibility
  app.get("/version", (req, res) => res.send("0.0.0"));
  app.get("/config", (req, res) => res.send(config)); // client may dynamically change config

  // Add the middleware needed to serve html/js/css, defaulting to statically serving the "/build" folder
  if (!middleware && paths.appBuild) {
    middleware = express.static(paths.appBuild)
  }
  middleware && app.use(middleware);

  // Error handler, for when a device not on the ipWhitelist tries to access
  app.use(function (err, req, res, next) {
    if (err instanceof IpDeniedError) {
      console.log(err.message);
      res.status(403).send("This device is not allowed to access your mirror. <br> Please check your config.js to change this.");
    } else {
      next(err);
    }
  });

  const nodeHelpers = collectNodeHelpers(paths);

  io.of("_").on("startHelper", (helperName) => {
    // Start helper if not already started
    if (nodeHelpers[helperName]) {
      if (!nodeHelpers[helperName].isLoaded()) {
        // Load helper with esm for ES6 import/export
        nodeHelpers[helperName].load(io)
      }
    } else {
      console.log(`No helper found for module ${helperName}.`);
    }
  });
  io.of("_").on("stopHelper", (helperName) => {
    // Stop helper if already started
    if (nodeHelpers[helperName] && nodeHelpers[helperName].isLoaded()) {
      nodeHelpers[helperName].unload();
    }
  })

  return {
    listen() {
      server.listen(config.port, config.address || null);
      //this.server.once("error", this.stop.bind(this));
    },
    stop() {
      //this.server.on('connection', (socket) => socket.unref());
      Object.values(this.nodeHelpers).forEach(helper => helper.unload());
      return new Promise((resolve, reject) => {
        this.server.once("close", err => err ? reject(err) : resolve);
        this.server.close(err => err ? reject(err) : resolve);
        this.server.once("error", reject);
        setTimeout(resolve, 100);
      });
      //this.server.close();
    },
    port: config.port
  }
}

/**
 *
 * @param {*} modulePath
 */
function getHelperFor(modulePath) {
  const moduleName = path.basename(modulePath);
  const nodeHelperPath = path.resolve(modulePath, `node_helper.js`);
  if (fs.existsSync(nodeHelperPath)) {
    return {
      name: moduleName,
      path: nodeHelperPath,
      instance: null,
      load(io) {
        try {
          if (!this.instance) {
            this.instance = new (esmImport(nodeHelperPath))(io);
          }
        } catch (e) {
          return false;
        }
        this.instance.start();
      },
      unload() {
        if (this.instance) {
          this.instance.stop();
          this.instance = null;
          delete require.cache[nodeHelperPath];
        }
      },
      isLoaded() {
        return Boolean(this.instance);
      }
    };
  }
}

// returns array of absolute paths to child directories within parentDir
function readChildDirs(parentDir) {
  return fs.existsSync(parentDir) ?
    fs.readdirSync(parentDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.resolve(parentDir, dirent.name))
    : []
}

// returns object of { [helper]: HelperWrapper }
function collectNodeHelpers(paths) {
  // Collect all modules dirs except default/, and all modules within default/
  const moduleDirs = readChildDirs(paths.appModules)
    .filter(dir => dir !== paths.appModulesDefault)
    .concat(readChildDirs(paths.appModulesDefault));
  const nodeHelpers = {};
  for (const modulePath of moduleDirs) {
    const helper = getHelperFor(modulePath);
    if (helper) {
      nodeHelpers[helper.name] = helper;
    }
  }
  return nodeHelpers;
}
