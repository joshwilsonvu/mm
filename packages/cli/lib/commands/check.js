"use strict";

const { Command } = require("clipanion");

class CheckCommand extends Command {
  static usage = Command.Usage({
    description: "Check your files for problems.",
    details:
      "`mm check` checks your files for potential problems using ESLint and TypeScript.",
    examples: [
      ["Check your config and source files", "yarn mm check"],
      ["Watch files and update results", "yarn mm check --watch"],
    ],
  });

  watch = false;

  async execute() {
    const paths = this.context.paths();

    const webpackConfig = require("../shared/webpack.config")({
      mode: process.env.NODE_ENV,
      paths: paths,
      check: true,
    });
    // Make the compiler emit files to memory instead of to the build/ folder
    webpackConfig.plugins.push(new NoEmitWebpackPlugin());

    const createCompiler = require("../shared/create-compiler");
    const compiler = createCompiler({
      config: webpackConfig,
    });

    if (this.watch) {
      const watching = compiler.watch(
        compiler.options.watchOptions,
        (err) => err && console.error(err)
      );

      console.info("Press 'q' to quit.");
      const keypress = require("../shared/keypress");
      const kp = keypress();
      kp.on("q", () => process.kill(process.pid, "SIGINT"));

      return new Promise((resolve) => {
        process.once("SIGINT", () => {
          watching.close();
          kp.done();
          setTimeout(() => process.exit(0), 1000).unref();
          resolve();
        });
      });
    } else {
      const { promisify } = require("util");

      const stats = await promisify(compiler.run.bind(compiler))();
      return Number(stats.hasErrors());
    }
  }
}
CheckCommand.addPath("check");
CheckCommand.addOption("watch", Command.Boolean("-w,--watch"));

module.exports = CheckCommand;

class NoEmitWebpackPlugin {
  constructor() {
    const { createFsFromVolume, Volume } = require("memfs");
    this.ofs = createFsFromVolume(new Volume());
    this.ofs.join = require("path").join;
  }
  apply(compiler) {
    for (const c of compiler.compilers || [compiler]) {
      c.outputFileSystem = this.ofs;
    }
  }
}
