"use strict";

const fs = require("fs-extra");
const path = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const express = require("express");
const SocketIO = require("socket.io");
const chalk = require("chalk");
const { IpFilter, IpDeniedError } = require("express-ipfilter");

module.exports = async function start() {
  // Start the Snowpack dev server
  const server = await this.context.getServer();
  const runtime = await this.context.getRuntime();
  const paths = this.context.getPaths();
  const config = await this.context.getConfig();

  // Initialize the express app
  const app = express();

  // Log error requests
  morgan.token("status-text", function (_, res) {
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
        skip: (_, res) => res.statusCode < 400,
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

  // Use top-level package version
  const version = fs.readJsonSync(paths.packageJson).version || "0.0.0";
  app.get("/version", (_, res) => res.json(version));
  // Config goes stale if client dynamically changes config
  app.get("/config", (_, res) =>
    res.type("application/json").send(JSON.stringify(config, null, 2))
  );

  // Error handler, for when a device not on the ipAllowlist tries to access
  app.use(function (err, _, res, next) {
    if (err instanceof IpDeniedError) {
      console.warn(err.message);
      res.status(403).send();
    } else {
      return next(err);
    }
  });

  // Create WebSocket server
  const modules = this.context.getModules();
  const io = SocketIO();
  io.of((_1, _2, next) => next(null, true)) // this lets us connect with dynamic namespaces
    .on("connect", async (socket) => {
      let helperName = socket.nsp.name;
      if (helperName.startsWith("/")) {
        helperName = helperName.substr(1);
      }
      // Start helper if not already started
      if (modules.hasOwnProperty(helperName)) {
        const m = modules[helperName];
        let helperModule;
        if (m.refcount === 0 && m.helperPath) {
          try {
            // import as ESM
            helperModule = await runtime.importModule(
              server.getUrlForFile(m.helperPath)
            ).exports;
          } catch (e) {
            // require as CommonJS, or surface error
            helperModule = require(m.helperPath);
          }
          if (helperModule) {
            const HelperClass = helperModule.default || helperModule;
            try {
              m.helper = new HelperClass(io, m.helperPath);
              m.helper.start();
              m.refcount = 1;
            } catch (e) {
              m.helper = null;
              throw e;
            }
          }
        } else if (m.refcount > 0) {
          m.refcount += 1;
        }
      } else {
        console.log(`No helper found for module ${helperName}.`);
      }
      // On disconnect, stop helper if not currently in use.
      socket.on("disconnect", () => {
        if (modules.hasOwnProperty(helperName)) {
          const m = modules[helperName];
          if (m.refcount > 0) {
            setTimeout(() => {
              m.refcount -= 1;
              if (m.refcount <= 0 && m.helper) {
                m.refcount = 0;
                m.helper.stop();
                m.helper = null;
                delete require.cache(m.helperPath);
              }
            }, 2000).unref();
          }
        }
      });
    });

  // Connect helper routers to the Express app, when the helpers are running
  Object.values(modules).forEach((m) => {
    app.use((req, res, next) => {
      if (m.helper && m.helper.router) {
        m.helper.router(req, res, next);
      } else {
        next();
      }
    });
  });

  // Pass all other requests to Snowpack, which will serve source files and manage HMR
  app.use((req, res) => server.handleRequest(req, res, { handleError: true }));

  return new Promise((resolve) => {
    process.on("SIGINT", () => {
      resolve();
    });
  })
    .then((resolve) => io.close(resolve))
    .then(() => server.shutdown && server.shutdown());
};
