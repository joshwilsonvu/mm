const Bundler = require("parcel-bundler");
const { Server } = require("./shared/server");

module.exports = start;

// will be applied with a CLI 'this' argument with config, paths, etc.
function start() {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }

  this.preflightCheck();

  let server = new Server(this.config, this.paths);
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

  this.formatBundlerEvents(bundler, true);

  let handler;
  const stopPromise = new Promise((resolve, reject) => {
    handler = function() {
      Promise.race([
        Promise.all([
          server.stop.bind(server),
          bundler.stop.bind(bundler),
        ]),
        new Promise((_, rej) => setTimeout(() => rej(new Error("Couldn't shut down gracefully.")))),
      ]).then(resolve, reject);

    }
  });
  // must call stop() to settle promise and await stop to await it.
  // or do both with await stop().
  function stop() {
    handler();
    return stopPromise;
  }

  stop.then = stopPromise.then.bind(stopPromise); // make stop a thenable so it can be awaited

  //setTimeout(() => process.exit(), 10000);

  return stop;
}