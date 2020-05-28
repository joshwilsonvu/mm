'use strict';

const fs = require("fs-extra");
const path = require("path");
const express = require("express");
const SocketIO = require("socket.io");
const { IpFilter, IpDeniedError } = require("express-ipfilter");
const morgan = require("morgan");
const helmet = require("helmet");
const { promisify } = require("util");


/**
 * Runs a express/socket.io server that serves MagicMirror files and runs node helpers.
 * @param {object} config
 * @param {object} paths
 * @param {function} middleware optional middleware to serve application html/js/css etc.
 */
module.exports = async function Server(config, paths, middleware) {
  // Initialize the express app
  const app = express();
  const server = await createHttpServer(config, app);
  const io = SocketIO(); //**** */
  // Minimize amount of data sent
  // Only allow whitelisted IP addresses
  if (config.ipWhitelist.length) {
    app.use(IpFilter(config.ipWhitelist, { mode: "allow", log: false }));
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

  // Use top-level package version
  const version = (fs.existsSync(paths.appPackageJson) && fs.readJsonSync(paths.appPackageJson).version) || "0.0.0";
  app.get("/version", (req, res) => res.send(version));
  // Config goes stale if client dynamically changes config
  app.get("/config", (req, res) => res.send(config));

  const nodeHelpers = collectNodeHelpers(paths);
  io.on("connect", socket => {
    let helperName = socket.nsp;
    if (helperName.startsWith("/")) {
      helperName = helperName.substr(1);
    }
    console.log("connecting namespace", helperName);
    // Start helper if not already started
    const helper = nodeHelpers[helperName];
    if (helper) {
      helper.ref(io);
    } else {
      console.log(`No helper found for module ${helperName}.`);
    }
    socket.on("disconnect", () => {
      if (nodeHelpers[helperName]) {
        nodeHelpers[helperName].unref();
      }
    })
  });

  // Use each helper's router, if the helper is currently loaded
  Object.values(nodeHelpers)
    .map(helper => (res, req, next) => {
      if (helper.isLoaded() && typeof helper.instance.router === "function") {
        helper.instance.router(res, req, next);
      } else {
        next();
      }
    })
    .forEach(router => app.use(router));

  // Add the middleware needed to serve html/js/css, defaulting to statically serving the "/build" folder
  if (!middleware && paths.appBuild) {
    middleware = express.static(paths.appBuild)
  }
  middleware && app.use(middleware);

  app.get("*", (req, res) => {
    res.status(404).send(`
    <html><head>
      <style>body { background: #000; color: #FFF; width: 100%; text-align: center } main { display: inline-block; }</style>
    </head><body><main>
      <h1>Something is wrong.</h4>
      <p>Check the output of your terminal for more information.</p>
    </main></body></html>`);
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

  return {
    listen() {
      const port = config.port, host = config.address;
      server.listen({ port, host }, () => console.log(`Listening on ${config.url}`));
      //this.server.once("error", this.stop.bind(this));

      process.on("SIGINT", () => {
        Object.values(nodeHelpers).forEach(helper => helper.unref());
        server.close();
      })
    },
    reload() {
      Object.values(nodeHelpers).forEach(helper => helper.reload());
    },
    port: config.port,
  }
}

/**
 * Returns an object representing the node helper for a given path
 * @param {*} modulePath the path to the directory containing a `node_helper`
 */
function getHelperFor(modulePath, paths) {
  const moduleName = path.basename(modulePath);
  const requirePath = path.relative(paths.cwd, path.resolve(modulePath, "node_helper")).replace("\\", "/");
  let nodeHelperPath;
  try {
    nodeHelperPath = paths.resolve(requirePath); // adds appropriate file extension and ensures file exists
  } catch (err) {
    return null;
  }
  return {
    name: moduleName,
    path: nodeHelperPath,
    instance: null,
    refcount: 0,
    ref(io) {
      if (this.refcount === 0) {
        this._load(io);
      }
      this.refcount += 1;
    },
    unref() {
      this.refcount -= 1;
      if (this.refcount <= 0) {
        this.refcount = 0;
        this._unload();
      }
    },
    _load(io) {
      if (!this.instance) {
        this.instance = new (require(nodeHelperPath))(io);
      } else {
        throw new Error("already loaded");
      }
      this.instance.start();
    },
    _unload() {
      if (this.instance) {
        this.instance.stop();
        this.instance = null;
        delete require.cache[nodeHelperPath];
      } else {
        throw new Error("not loaded");
      }
    },
    reload(io) {
      // preserve existing refcount and force reload
      if (this.refcount > 0) {
        this._unload();
        this._load(io);
      }
    },
    isLoaded() {
      return Boolean(this.instance);
    }
  };
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
    const helper = getHelperFor(modulePath, paths);
    if (helper) {
      nodeHelpers[helper.name] = helper;
    }
  }
  return nodeHelpers;
}

async function createHttpServer(config, app) {
  if (config.useHttps) {
    let options;
    if (config.httpsPrivateKey && config.httpsCertificate) {
      options = {
        key: fs.readFileSync(config.httpsPrivateKey),
        cert: fs.readFileSync(config.httpsCertificate)
      };
    } else {
      // if useHttps is set but not httpsPrivateKey and httpsCertificate, generate them on the fly
      const pem = require("pem");
      console.log("Generating HTTPS certificate...");
      const { certificate, serviceKey } = await promisify(pem.createCertificate.bind(pem))({ selfSigned: true, days: 365 });
      options = { key: serviceKey, cert: certificate };
    }
    // redirect http:// to https://
    app.set("trust proxy", true);
    app.use("/", (req, res, next) => {
      if (!req.secure) {
        return res.redirect(`https://${req.get("Host")}/`)
      }
      next();
    });
    return require("https").Server(options, app);
  } else {
    return require("http").Server(app);
  }
}
