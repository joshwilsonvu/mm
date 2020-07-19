"use strict";

const { Command } = require("clipanion");

const details = `\`mm start\` compiles your files on the fly and updates \
the app instantly as you update your code or config.

Use it to quickly configure your mirror or develop your module before optimizing performance \
with \`mm build\`.`;

class StartCommand extends Command {
  static usage = Command.Usage({
    description:
      "Start the app and instantly see changes to your source files.",
    details: details,
    examples: [
      ["Start with live updates", "yarn mm start"],
      ["Start in a browser instead of Electron", "yarn mm start --browser"],
      [
        "Start to be viewed on another device with `mm view`",
        "yarn mm start --no-view",
      ],
    ],
  });

  // options
  noView = false;
  browser = false;
  check = false;

  async execute() {
    const fs = require("fs-extra");
    const path = require("path");

    const paths = this.context.paths();
    const config = this.context.config();

    const url = `http${config.useHttps ? "s" : ""}://${config.address}:${
      config.port
    }`;

    const webpackConfig = require("../shared/webpack.config")({
      mode: process.env.NODE_ENV,
      paths: paths,
      check: Boolean(this.check),
    });
    const createCompiler = require("../shared/create-compiler");
    const compiler = createCompiler({
      config: webpackConfig,
    });

    const webpackDevMiddleware = require("webpack-dev-middleware");
    const webpackHotMiddleware = require("webpack-hot-middleware");
    const hotMiddleware = webpackHotMiddleware(compiler, { log: false });
    const devMiddleware = webpackDevMiddleware(compiler, {
      logLevel: "silent",
    });

    const createServer = require("../shared/create-server");
    const server = await createServer(
      config,
      paths,
      hotMiddleware,
      devMiddleware
    );
    console.success("Listening on", url);
    console.info("Press 'q' to quit. Press 'r' to force rebuild.");
    server.listen();

    const keypress = require("../shared/keypress");
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
      // Remove stale built files, if present, when `mm start` successfully builds new files in memory
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
  }
}

StartCommand.addPath("start");
StartCommand.addOption("noView", Command.Boolean("--no-view"));
StartCommand.addOption("browser", Command.Boolean("-b,--browser"));
StartCommand.addOption("check", Command.Boolean("-c,--check"));

module.exports = StartCommand;
