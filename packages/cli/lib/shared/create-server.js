"use strict";

const fs = require("fs-extra");
const path = require("path");
const express = require("express");
const SocketIO = require("socket.io");
const { IpFilter, IpDeniedError } = require("express-ipfilter");
const morgan = require("morgan");
morgan.token("status-text", function (req, res) {
  return res.statusMessage;
});
const helmet = require("helmet");
const chalk = require("chalk");
const { promisify } = require("util");

/**
 * Runs a express/socket.io server that serves MagicMirror files and runs node helpers.
 * @param {object} config
 * @param {object} paths
 * @param {function} middleware optional middleware to serve application html/js/css etc.
 */
module.exports = async function createServer(config, paths, ...middlewares) {
  // Initialize the express app
  const app = express();
  const server = await createHttpServer(config, app);
  if (config.useHttps) {
    app.use("*", (req, res, next) => {
      console.log(`Got ${req.secure ? "secure" : "insecure"} request`);
      if (!req.secure) {
        return res.redirect(`https://${req.get("Host")}/`);
      }
      next();
    });
  }
  // Log error requests
  app.use(
    morgan(
      `A :method request to ${chalk.underline(":url")} from ${chalk.underline(
        ":remote-addr"
      )} failed with status ${chalk.red(":status :status-text")}. ${chalk.dim(
        "(:res[content-length] bytes, :total-time ms)"
      )}`,
      {
        skip(req, res) {
          return res.statusCode < 400;
        },
      }
    )
  );
  // Only allow listed IP addresses
  if (config.ipAllowlist.length) {
    app.use(IpFilter(config.ipAllowlist, { mode: "allow", log: false }));
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
  const version =
    (fs.existsSync(paths.appPackageJson) &&
      fs.readJsonSync(paths.appPackageJson).version) ||
    "0.0.0";
  app.get("/version", (_, res) => res.json(version));
  // Config goes stale if client dynamically changes config
  app.get("/config", (_, res) =>
    res.type("application/json").send(JSON.stringify(config, null, 2))
  );

  const io = SocketIO(server);
  const nodeHelpers = collectNodeHelpers(paths);
  io.of((nsp, query, next) => {
    return next(null, true); // this lets us connect with dynamic namespaces
  }).on("connect", (socket) => {
    let helperName = socket.nsp.name;
    if (helperName.startsWith("/")) {
      helperName = helperName.substr(1);
    }
    // Start helper if not already started
    const helper = nodeHelpers[helperName];
    if (helper) {
      helper.ref(io);
    } else {
      console.log(`No helper found for module ${helperName}.`);
    }
    socket.on("disconnect", () => {
      if (helper) {
        helper.unref();
      }
    });
  });

  // Use each helper's router, if the helper is currently loaded
  Object.values(nodeHelpers)
    .map((helper) => (res, req, next) => {
      if (helper.instance && typeof helper.instance.router === "function") {
        helper.instance.router(res, req, next);
      } else {
        return next();
      }
    })
    .forEach((router) => app.use(router));

  // Add the middleware needed to serve html/js/css, defaulting to statically serving the "/build" folder
  if (!middlewares.length) {
    if (paths.appBuild && fs.readdirSync(paths.appBuild).length > 0) {
      middlewares = [express.static(paths.appBuild)];
    } else {
      console.warn("No content found to serve; has `mm build` been run?");
    }
  }
  middlewares.forEach((middleware) => app.use(middleware));

  // 404 for all paths not already handled
  app.get("*", (_, res) => {
    res.status(404).type("html").send(`
    <html><head>
      <style>body { background: #000; color: #FFF; width: 100%; text-align: center } main { display: inline-block; }</style>
    </head>
    <body><main>
      <h1>Something is wrong.</h4>
      <p>Check the output of your terminal for more information.</p>
    </main></body></html>`);
  });

  // Error handler, for when a device not on the ipAllowlist tries to access
  app.use(function (err, _, res, next) {
    if (err instanceof IpDeniedError) {
      console.warn(err.message);
      res.status(403).type("html").send(`
      <html><head>
        <style>body { background: #000; color: #FFF; width: 100%; text-align: center } main { display: inline-block; }</style>
      </head>
      <body><main>
        <h1>This device is not allowed to access your mirror.</h4>
        <p>Check the output of your terminal for more information.</p>
      </main></body></html>`);
    } else {
      return next(err);
    }
  });

  return {
    listen() {
      const port = config.port,
        host = config.address;
      server.listen(port);

      process.on("SIGINT", () => {
        // shut down helpers even if they have connections
        Object.values(nodeHelpers).forEach((helper) => helper._unload());
        server.close();
      });
    },
    reload() {
      Object.values(nodeHelpers).forEach((helper) => helper.reload());
    },
    port: config.port,
  };
};

/**
 * Returns an object representing the node helper for a given path
 * @param {*} modulePath the path to the directory containing a `node_helper`
 */
function getHelperFor(modulePath) {
  const moduleName = path.basename(modulePath);
  const requirePath = path
    .resolve(modulePath, "node_helper")
    .replace(/^[A-Z]:\\/, "/")
    .replace("\\", "/");
  let nodeHelperPath;
  try {
    nodeHelperPath = require.resolve(requirePath); // adds appropriate file extension and ensures file exists
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
        let Class = require(nodeHelperPath);
        if (Class.__esModule && Class.default) {
          Class = Class.default;
        }
        this.instance = new Class(io, nodeHelperPath);
        this.instance.start();
      }
    },
    _unload() {
      if (this.instance) {
        this.instance.stop();
        this.instance = null;
        delete require.cache[nodeHelperPath];
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
    },
  };
}

// returns array of absolute paths to child directories within parentDir
function readChildDirs(parentDir) {
  return fs.existsSync(parentDir)
    ? fs
        .readdirSync(parentDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => path.resolve(parentDir, dirent.name))
    : [];
}

// returns object of { [helper]: HelperWrapper }
function collectNodeHelpers(paths) {
  // Collect all modules dirs except default/, and all modules within default/
  const moduleDirs = readChildDirs(paths.appModules)
    .filter((dir) => dir !== paths.appModulesDefault)
    .concat(readChildDirs(paths.appModulesDefault));
  const nodeHelpers = {};
  for (const modulePath of moduleDirs) {
    const helper = getHelperFor(modulePath);
    if (helper) {
      console.debug("found helper for", modulePath);
      nodeHelpers[helper.name] = helper;
    }
  }
  return nodeHelpers;
}

async function createHttpServer(config, app) {
  if (config.useHttps) {
    let options = {};
    if (config.httpsPrivateKey && config.httpsCertificate) {
      console.debug("Using HTTPS certificate from config");
      options = {
        key: fs.readFileSync(config.httpsPrivateKey),
        cert: fs.readFileSync(config.httpsCertificate),
      };
    } else {
      // if useHttps is set but not httpsPrivateKey and httpsCertificate, generate them on the fly
      const pem = require("pem");
      console.log("Generating one-time HTTPS certificate");
      const { certificate, serviceKey } = await promisify(
        pem.createCertificate.bind(pem)
      )({ selfSigned: true, days: 365 });
      // For self-signed certificates, the certificate is its own CA.
      options = { key: serviceKey, cert: certificate, ca: certificate };
    }
    // redirect http:// to https://
    app.set("trust proxy", true);
    return require("https").createServer(options, app);
  } else {
    return require("http").createServer(app);
  }
}
