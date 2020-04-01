const Bundler = require("parcel-bundler");
const { Server } = require("./shared/server");

module.exports = dev;

// will be applied with a CLI 'this' argument with config, paths, etc.
function dev() {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }

  this.preflightCheck();

  let server = new Server(this.config, !this.options.serveronly);
  server.addNodeHelpers();

  console.log(`Starting server on port ${server.port}...`);
  server.listen();
  if (Array.isArray(this.config.ipWhitelist) && this.config.ipWhitelist.length === 0) {
    console.info("You're using a full whitelist configuration to allow for all IPs");
  }

  // Serve the client bundle in development mode, watching for changes
  const bundler = new Bundler(this.paths.appIndexHtml, {
    outDir: this.paths.appBuild,
    target: "browser",
    watch: true,
    logLevel: 0,
    killWorkers: true,
  });
  server.app.use(bundler.middleware());
  
  this.formatBundlerEvents(bundler);

  function finish() {
    return Promise.race([
      Promise.all([() => server.stop(), () => bundler.stop()]),
      new Promise((_, rej) => setTimeout(rej, 6000, new Error("Couldn't shut down gracefully."))),
    ])
  }
  const promise = new Oath(() => {});
  promise.then(finish, finish).then(() => this.spinner.stop("")); // run on resolve or reject
  process.once("SIGINT", () => {
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