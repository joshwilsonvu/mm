"use strict";

const fs = require("fs-extra");
const path = require("path");
const express = require("express");
const SocketIO = require("socket.io");
const { IpFilter, IpDeniedError } = require("express-ipfilter");
const morgan = require("morgan");
const helmet = require("helmet");
const chalk = require("chalk");
const paths = require("./paths");
const config = require("./config");
const findModules = require("./find-modules");

/**
 * Creates a express/socket.io server that serves MagicMirror files and runs node helpers.
 */
module.exports = function createServer() {
  // Initialize the express app
  const app = express();

  // Log error requests
  addLogger(app);

  // Only allow listed IP addresses
  if (config.ipAllowlist.length) {
    app.use(IpFilter(config.ipAllowlist, { mode: "allow", log: false }));
  }
  // Add various security measures
  app.use(helmet());
  // Serve client-side files
  app.use(express.urlencoded({ extended: true }));

  // Use top-level package version
  const version = fs.readJsonSync(paths.packageJson).version || "0.0.0";
  app.get("/version", (_, res) => res.json(version));
  // Config goes stale if client dynamically changes config
  app.get("/config", (_, res) =>
    res.type("application/json").send(JSON.stringify(config, null, 2))
  );

  const nodeHelpers = collectNodeHelpers();
  const io = createSocketServer(nodeHelpers);
  addHelperRouters(app, nodeHelpers);

  // Error handler, for when a device not on the ipAllowlist tries to access
  app.use(function (err, _, res, next) {
    if (err instanceof IpDeniedError) {
      console.warn(err.message);
      res.status(403).send();
    } else {
      return next(err);
    }
  });

  return {
    app,
    io,
  };
};

function createSocketServer(nodeHelpers) {
  const io = SocketIO(require("../..").SOCKET_PORT);
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
  return io;
}

function addHelperRouters(app, nodeHelpers) {
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
}

function addLogger(app) {
  morgan.token("status-text", function (req, res) {
    return res.statusMessage;
  });
  app.use(
    morgan(
      `A :method request to ${chalk.underline(":url")} from ${chalk.underline(
        ":remote-addr"
      )} failed with status ${chalk.red(":status :status-text")}. ${chalk.dim(
        "(:res[content-length] bytes, :total-time ms)"
      )}`,
      {
        skip(_, res) {
          return res.statusCode < 400;
        },
      }
    )
  );
}

/**
 * Returns an object representing the node helper for a given path
 * @param {*} modulePath the path to the directory containing a `node_helper`
 */
function getHelperFor(modulePath) {
  const moduleName = path.basename(modulePath);
  const requirePath = path.resolve(modulePath, "node_helper");
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
    isLoaded() {
      return Boolean(this.instance);
    },
  };
}

// returns object of { [helper]: HelperWrapper }
function collectNodeHelpers() {
  // Collect all modules dirs except default/, and all modules within default/
  const moduleDirs = findModules();
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
