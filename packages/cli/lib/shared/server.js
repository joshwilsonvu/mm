const fs = require("fs-extra");
const path = require("path");
const http = require("http");
const express = require("express");
const { IpFilter, IpDeniedError } = require("express-ipfilter");
const socketIo = require("socket.io");
const morgan = require("morgan");
const helmet = require("helmet");
const esm = require("esm");
const esmRequire = esm(module);


function helperWrapper(modulePath) {
  const moduleName = path.basename(modulePath);
  const nodeHelperPath = path.resolve(modulePath, `node_helper.js`);
  if (fs.existsSync(nodeHelperPath)) {
    return {
      name: moduleName,
      path: nodeHelperPath,
      helper: null,
      load(...constructorArgs) {
        if (!this.isLoaded) {
          this.helper = new (esmRequire(nodeHelperPath))(...constructorArgs);
        }
        return this.helper;
      },
      unload() {
        this.helper = null;
        delete require.cache[nodeHelperPath];
      },
      isLoaded() {
        return Boolean(this.helper);
      }
    }
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

// returns object of { [helper]: { path: string, helper?: object } }
function collectNodeHelpers(paths) {
  // Collect all modules dirs except default/, and all modules within default/
  const moduleDirs = readChildDirs(paths.appModules)
    .filter(dir => dir === paths.appModulesDefault)
    .concat(readChildDirs(paths.appModulesDefault));
  let nodeHelpers = {};
  for (const modulePath of moduleDirs) {
    const wrapper = helperWrapper(modulePath);
    if (wrapper) {
      nodeHelpers[wrapper.name] = wrapper;
    }
  }
  return nodeHelpers;
}

class Server {
  /**
   *
   * @param {*} config
   */
  constructor(config, paths) {
    // Initialize the express app
    const app = express();
    const server = http.Server(app);
    const io = socketIo(server);
    // Only allow whitelisted IP addresses
    if (config.ipWhitelist.length) {
      //app.use(IpFilter(config.ipWhitelist, { mode: "deny", log: false }));
    }
    // Add logging
    if (process.env.NODE_ENV === "development") {
      app.use(morgan("dev"));
    }
    // Add various security measures
    app.use(helmet());
    // Serve client-side files
    app.use(express.urlencoded({ extended: true }));
    for (const directory of ["css", "fonts", "modules", "vendor", "translations"]) {
      const dirpath = path.resolve(directory);
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

    this.config = config; // the app's configuration
    this.paths = paths; // useful filesystem paths
    this.app = app; // the app's express instance
    this.server = server; // the http server
    this.io = io; // the socket.io instance
    this.nodeHelpers = {}; // a map of module => { path, helper }
  }

  addNodeHelpers() {
    this.nodeHelpers = collectNodeHelpers(this.paths);
    // Use "_" namespace for special things like starting node helpers
    const ioCore = this.io.of("_");
    ioCore.on("startHelper", helperName => {
      // Start helper if not already started
      if (this.nodeHelpers[helperName]) {
        if (!this.nodeHelpers[helperName].isLoaded()) {
          // Load helper with esm for ES6 import/export
          const helper = this.nodeHelpers[helperName].load(
            helperName,
          )
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
    //this.server.once("error", this.stop.bind(this));
  }

  stop() {
    //this.server.on('connection', (socket) => socket.unref());
    Object.values(this.nodeHelpers).forEach(nh => nh.helper && nh.helper.stop());
    return new Promise((resolve, reject) => {
     this.server.once("close", err => err ? reject(err) : resolve);
     this.server.close(err => err ? reject(err) : resolve);
     this.server.once("error", reject);
    });
    //this.server.close();
  }

  get port() {
    return this.config.port;
  }
}

module.exports = {
  Server
}
