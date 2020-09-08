"use strict";

const createConfig = require("../shared/webpack.config");
const createCompiler = require("../shared/create-compiler");
const keypress = require("../shared/keypress");
const { promisify } = require("util");
const { createFsFromVolume, Volume } = require("memfs");
const join = require("path").join;

module.exports = function () {
  const paths = this.context.paths();

  const webpackConfig = createConfig({
    mode: "development",
    paths: paths,
    check: true,
  });
  // Make the compiler emit files to memory instead of to the build/ folder
  webpackConfig.plugins.push(new NoEmitWebpackPlugin());

  const compiler = createCompiler({
    config: webpackConfig,
  });

  if (this.watch) {
    const watching = compiler.watch(
      compiler.options.watchOptions,
      (err) => err && console.error(err)
    );

    const kp = keypress();
    kp.on("q", () => process.kill(process.pid, "SIGINT"));
    console.info("Press 'q' to quit.");

    return new Promise((resolve) => {
      process.once("SIGINT", () => {
        watching.close();
        kp.done();
        setTimeout(() => process.exit(0), 1000).unref();
        resolve();
      });
    });
  } else {
    return promisify(compiler.run.bind(compiler))().then((stats) =>
      Number(stats.hasErrors())
    );
  }
};

class NoEmitWebpackPlugin {
  constructor() {
    this.ofs = createFsFromVolume(new Volume());
    this.ofs.join = join;
  }
  apply(compiler) {
    for (const c of compiler.compilers || [compiler]) {
      c.outputFileSystem = this.ofs;
    }
  }
}
