"use strict";

const fs = require("fs-extra");
const path = require("path");
const createConfig = require("../shared/webpack.config");
const createCompiler = require("../shared/create-compiler");
const createServer = require("../shared/create-server");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const keypress = require("../shared/keypress");

module.exports = async function () {
  const paths = this.context.paths();
  const config = this.context.config();

  const url = `http${config.useHttps ? "s" : ""}://${config.address}:${
    config.port
  }`;

  const webpackConfig = createConfig({
    mode: "development",
    paths: paths,
    check: !this.fast,
  });
  const compiler = createCompiler({
    config: webpackConfig,
  });

  const hotMiddleware = webpackHotMiddleware(compiler, { log: false });
  const devMiddleware = webpackDevMiddleware(compiler, {
    logLevel: "silent",
  });

  const server = await createServer(
    config,
    paths,
    hotMiddleware,
    devMiddleware
  );
  console.success("Listening on", url);
  console.info("Press 'q' to quit. Press 'r' to force rebuild.");
  server.listen();

  const kp = keypress();
  kp.on("q", () => process.kill(process.pid, "SIGINT"));
  let valid = true;
  kp.on("r", async () => {
    if (valid) {
      await fs.remove(path.resolve(paths.appNodeModules, ".cache"));
      devMiddleware.invalidate();
      valid = false;
      devMiddleware.waitUntilValid(() => (valid = true));
    }
  });

  devMiddleware.waitUntilValid(async () => {
    if (this.noView) {
      // don't open anything
    } else if (this.browser) {
      const openBrowser = require("react-dev-utils/openBrowser");
      openBrowser(config.url);
    } else {
      const createWindow = require("../shared/create-window");
      const window = createWindow(config, { dev: true });
      await window.open();
    }
    // Remove stale built files, if present, when `mm start` successfully builds new files in memory.
    // This means a future `mm serve` won't
    await fs.remove(paths.appBuild);
  });

  return new Promise((resolve) => {
    process.once("SIGINT", () => {
      devMiddleware.close();
      hotMiddleware.close();
      kp.done();
      setTimeout(() => process.exit(0), 1000).unref();
      resolve();
    });
  });
};
