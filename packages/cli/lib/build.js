const Bundler = require("parcel-bundler");


function build({ config, paths, argv }) {
  // Build the client bundle once in production mode,
  // or use whatever is in the build folder if there is no source code
  const bundler = new Bundler(paths.appIndexHtml, {
    outDir: paths.appBuild,
    target: "browser",
    watch: false,
    logLevel: 2
  });
  bundler.on("bundled", () => {
    console.log("Built MagicMirror.");
    process.exit(0);
  });
  bundler.on("buildError", e => {
    console.error(e);
    process.exit(1);
  });
  bundler.bundle();
}

module.exports = build;