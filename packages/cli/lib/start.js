'use strict';

const fs = require("fs");
const { promisify } = require("util");
const createCompiler = require("./shared/create-compiler");
const printBuildError = require("react-dev-utils/printBuildError");
const chalk = require("chalk");

const { Server } = require("./shared/server");

module.exports = start;
function start() {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }

  const webpackConfig = require("./shared/webpack.config")({
    mode: "development",
    paths: this.paths,
  });
  const compiler = createCompiler({
    config: webpackConfig,
    useTypeScript: fs.existsSync(this.paths.appTsConfig),
  });


  const watching = compiler.watch({
    aggregateTimeout: 750,
    ignored: /node_modules/,
  }, () => {});

  // stop and wait with "await stop()";
  return stoppable(() => watching.close());
}

// returns a function that, when called, calls stopFn with an err-first callback and any additional args provided.
// The return value of the function is a promise that is resolved or rejected when stopFn calls the callback.
function stoppable(stopFn, ...args) {
  let handler;
  const stopPromise = new Promise((resolve, reject) => {
    handler = () => {
      promisify(stopFn)(...args)
        .then(resolve, reject);
    }
  });
  return () => {
    handler();
    return stopPromise;
  }
}

// // will be applied with a CLI 'this' argument with config, paths, etc.
// function startParcel() {
//   if (!process.env.NODE_ENV) {
//     process.env.NODE_ENV = 'development';
//   }

//   this.preflightCheck();

//   let server = new Server(this.config, this.paths);
//   server.addNodeHelpers();

//   console.log(`Starting server on port ${server.port}...`);
//   server.listen();
//   if (Array.isArray(this.config.ipWhitelist) && this.config.ipWhitelist.length === 0) {
//     console.info("You're using a full whitelist configuration to allow for all IPs");
//   }

//   // Serve the client bundle in development mode, watching for changes
//   const bundler = new Bundler(this.paths.appIndexHtml, {
//     outDir: this.paths.appBuild,
//     target: "browser",
//     watch: true,
//     logLevel: 0,
//     autoInstall: false
//   });
//   server.app.use(bundler.middleware());

//   this.formatBundlerEvents(bundler, true);

//   let handler;
//   const stopPromise = new Promise((resolve, reject) => {
//     handler = function() {
//       Promise.race([
//         Promise.all([
//           server.stop.bind(server),
//           bundler.stop.bind(bundler),
//         ]),
//         new Promise((_, rej) => setTimeout(() => rej(new Error("Couldn't shut down gracefully.")))),
//       ]).then(resolve, reject);
//     }
//   });
//   // must call stop() to settle promise and await stop to await it.
//   // or do both with await stop().
//   function stop() {
//     handler();
//     return stopPromise;
//   }

//   stop.then = stopPromise.then.bind(stopPromise); // make stop a thenable so it can be awaited

//   //setTimeout(() => process.exit(), 10000);

//   return stop;
// }