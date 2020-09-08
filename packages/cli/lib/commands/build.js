"use strict";

const fs = require("fs-extra");
const { promisify } = require("util");
const createConfig = require("../shared/webpack.config");
const createCompiler = require("../shared/create-compiler");
const printBuildError = require("react-dev-utils/printBuildError");
const chalk = require("chalk");

module.exports = async function () {
  // Force production mode
  process.env.NODE_ENV = "production";

  const paths = this.context.paths();

  const webpackConfig = createConfig({
    mode: "production",
    paths: paths,
    analyze: Boolean(this.analyze),
    check: !this.fast,
  });
  if (!webpackConfig) {
    return 1;
  }
  const compiler = createCompiler({
    config: webpackConfig,
  });

  try {
    await fs.remove(paths.appBuild);
    await promisify(compiler.run.bind(compiler))();
    // build errors will be logged here
  } catch (err) {
    // log webpack errors, not build errors
    console.error(chalk.red("Failed to compile."));
    printBuildError(err);
    return 1;
  }
};
