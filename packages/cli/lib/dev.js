const Bundler = require("parcel-bundler");
const chalk = require("chalk");
const ora = require("ora");
const { Server } = require("./server");
const loadConfig = require("./load-config");
const paths = require("./paths");
const formatError = require("./format-error");

module.exports = dev;

/**
 * Run MagicMirror, with watching and reloading. Stop with C^c
 *
 * Returns a Promise with a done() property that will clean up and resolve the promise.
 */
function dev(opts) {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }

  const config = loadConfig(paths.appConfigJs);
  let server = new Server(config, !opts.serveronly);
  server.addNodeHelpers();

  console.log(`Starting server on port ${server.port}...`);
  server.listen();
  if (Array.isArray(config.ipWhitelist) && config.ipWhitelist.length === 0) {
    console.info("You're using a full whitelist configuration to allow for all IPs");
  }

  // Serve the client bundle in development mode, watching for changes
  const bundler = new Bundler(paths.appIndexHtml, {
    outDir: paths.appBuild,
    target: "browser",
    watch: true,
    logLevel: 0,
    killWorkers: true,
  });
  server.app.use(bundler.middleware());

  const spinner = ora({ color: "" })
  bundler.on("buildStart", () => {
    spinner.start("Building...");
  });
  bundler.on("bundled", () => {
    spinner.succeed(`MagicMirror built ${chalk.bold.green("successfully")}!`);
  });
  bundler.on("buildError", (err) => {
    spinner.fail(formatError(err));
  });

  function finish() {
    return Promise.race([
      Promise.all([() => server.stop(), () => bundler.stop()]),
      new Promise((_, rej) => setTimeout(rej, 6000, new Error("1"))),
    ])
  }
  const promise = new Oath(() => {});
  promise.then(finish, finish).then(() => spinner.stop("")); // run on resolve or reject
  process.once("SIGINT", () => {
    console.error("GOT SIGINT");
    promise.return()
  });
  return promise;
}

// Adds return() and throw() methods to manually resolve/reject the promise
class Oath extends Promise {
  constructor(fn) {
    let _resolve, _reject;
    super((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
      fn(resolve, reject);
    });
    Object.assign(this, { _resolve, _reject });
  }

  return(x) {
    this._resolve && this._resolve(x);
    return this;
  }

  throw(e) {
    this._reject && this._reject(e);
    return this;
  }
}