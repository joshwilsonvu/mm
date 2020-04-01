const Bundler = require("parcel-bundler");
const fs = require("fs");
const chalk = require("chalk");

module.exports = build;

// will be applied with a CLI 'this' argument with config, paths, etc.
async function build() {
  process.env.NODE_ENV = 'production';

  this.preflightCheck();

  // Build the client bundle once in production mode,
  // or use whatever is in the build folder if there is no source code
  const bundler = new Bundler(this.paths.appIndexHtml, {
    outDir: this.paths.appBuild,
    target: "browser",
    watch: false,
    logLevel: 0
  });
  this.formatBundlerEvents(bundler);
  await bundler.bundle();
  console.log(
    `MagicMirror built ${chalk.bold.green("successfully")}!`,
    `You can now start it with ${chalk.bold.cyan("mm serve")}.`
  );
  return 0;
}
