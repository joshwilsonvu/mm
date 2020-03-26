const Bundler = require("parcel-bundler");
const { Server } = require("./server");
const formatError = require("./format-error");

module.exports = async opts => {
  try {
    return dev(opts);
  } catch (err) {
    console.log(formatError);
    return 1;
  }
}

/**
 * Run MagicMirror, with watching and reloading. Stop with C^c
 *
 * Returns a Promise with a done() property that will clean up and resolve the promise.
 */
async function dev({ config, paths, argv }) {
  process.env.NODE_ENV = 'development';

  let server = new Server(config, !argv.serveronly);
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
    logLevel: 2
  });
  server.app.use(bundler.middleware());

  const promise = new Promise((resolve, reject) => {
    promise.done = resolve; // call done() to manually resolve
    process.on("SIGINT", () => {
      Promise.race([
        server.stop(),
        new Promise((_, rej) => setTimeout(rej, 1000, 1)),
      ])
        .then(resolve, reject);
    });
  });
  return promise;
}

