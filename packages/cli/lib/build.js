const Bundler = require("parcel-bundler");

module.exports = build;

// will be applied with a CLI 'this' argument with config, paths, etc.
async function build() {
  process.env.NODE_ENV = 'production';

  this.preflightCheck();

  // Build the client bundle once in production mode
  const bundler = new Bundler(this.paths.appIndexHtml, {
    outDir: this.paths.appBuild,
    target: "browser",
    watch: false,
    logLevel: 0,
    autoInstall: false,
  });
  this.formatBundlerEvents(bundler);
  await bundler.bundle();
  return 0;
}
