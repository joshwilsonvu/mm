'use strict';

const { Command } = require("clipanion");

const details = `\`mm build\` will compile all of your code, stylesheets, etc. into static files that browsers \
can understand. The files will be placed into the ./build folder.

Running \`mm serve\` will serve these static files and run Node helpers as needed based \
on the config.

\`mm build\` can take a long time, but it performs optimizations that make the application \
load and run faster.`;

class BuildCommand extends Command {
  static usage = Command.Usage({
    description: "Prepare all source files, stylesheets, and asset files to be served with `mm serve`.",
    details: details,
    examples: [
      ["build files for `mm serve`", "yarn mm build"],
      ["show information about the compiled files after building", "yarn mm build --analyze"],
    ]
  });

  analyze = false;

  async execute() {
    const fs = require("fs-extra");
    const { promisify } = require("util");
    const createCompiler = require("./shared/create-compiler");
    const printBuildError = require("react-dev-utils/printBuildError");
    const chalk = require("chalk");

    const paths = this.context.paths();

    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'production';
    }

    const webpackConfig = require("./shared/webpack.config")({
      mode: "production",
      paths: paths,
      analyze: Boolean(this.analyze),
    });
    if (!webpackConfig) {
      return 1;
    }
    const compiler = createCompiler({
      config: webpackConfig,
      useTypeScript: fs.existsSync(paths.appTsConfig),
    });

    try {
      await fs.remove(paths.appBuild);
      await promisify(compiler.run.bind(compiler))();
      // build errors will be logged here
    } catch (err) {
      // log webpack errors, not build errors
      console.error(chalk.red('Failed to compile.\n'));
      printBuildError(err);
      return 1;
    }
  }
}

BuildCommand.addPath("build");
BuildCommand.addOption("analyze", Command.Boolean("--analyze"));

module.exports = BuildCommand;

