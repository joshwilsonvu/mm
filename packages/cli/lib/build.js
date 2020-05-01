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
