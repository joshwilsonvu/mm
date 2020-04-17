'use strict';

const fs = require("fs");
const { promisify } = require("util");
const createCompiler = require("./shared/create-compiler");
const printBuildError = require("react-dev-utils/printBuildError");
const chalk = require("chalk");


module.exports = build;
async function build() {
  process.env.NODE_ENV = 'production';

  const webpackConfig = require("./shared/webpack.config")({
    mode: "production",
    paths: this.paths,
  });
  const compiler = createCompiler({
    config: webpackConfig,
    useTypeScript: fs.existsSync(this.paths.appTsConfig),
  });

  try {
    await promisify(compiler.run.bind(compiler))();
    // build errors will be logged here
  } catch (err) {
    // log webpack errors, not build errors
    console.log(chalk.red('Failed to compile.\n'));
    printBuildError(err);
  }

}

// // will be applied with a CLI 'this' argument with config, paths, etc.
// async function buildParcel() {
//   process.env.NODE_ENV = 'production';

//   this.preflightCheck();

//   // Build the client bundle once in production mode
//   const bundler = new Bundler(this.paths.appIndexHtml, {
//     outDir: this.paths.appBuild,
//     target: "browser",
//     watch: false,
//     logLevel: 0,
//     autoInstall: false,
//   });
//   this.formatBundlerEvents(bundler);
//   await bundler.bundle();
//   return 0;
// }
