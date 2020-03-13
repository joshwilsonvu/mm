const Bundler = require("parcel-bundler");
const { createApp, addNodeHelpers } = require("@mm/server");


/**
 * Run MagicMirror, with watching and reloading
 */
function dev({ config, paths, argv }) {
  let app = createApp(config);
  addNodeHelpers(app);

  console.log("Starting server on port " + config.port + " ... ");
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
  app.use(bundler.middleware());
}

module.exports = dev;