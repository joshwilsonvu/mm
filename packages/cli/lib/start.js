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

  async execute() {
    const fs = require("fs-extra");
    const path = require("path");
    const createCompiler = require("./shared/create-compiler");
    const webpackDevMiddleware = require("webpack-dev-middleware");
    const webpackHotMiddleware = require("webpack-hot-middleware");
    const openBrowser = require("react-dev-utils/openBrowser");

    const createServer = require("./shared/create-server");
    const createWindow = require("./shared/create-window");
    const keypress = require("./shared/keypress");

    const paths = this.context.paths();
    const config = this.context.config();

    const webpackConfig = require("./shared/webpack.config")({
      mode: process.env.NODE_ENV,
      paths: paths,
    });
    const compiler = createCompiler({
      config: webpackConfig,
      useTypeScript: fs.existsSync(paths.appTsConfig),
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
    console.success("Listening on", config.url);
    console.info("Press 'q' to stop. Press 'space' to force recompile.");
    server.listen();

    const kp = keypress();
    kp.on("q", () => process.kill(process.pid, "SIGINT"));
    let valid = true;
    kp.on(" ", async () => {
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
        openBrowser(config.url);
      } else {
        const window = createWindow(config, { dev: true });
        await window.open();
      }
    });

    return new Promise((resolve) => {
      process.once("SIGINT", () => {
        devMiddleware.close();
        hotMiddleware.close();
        kp.done();
        setTimeout(() => process.exit(0), 1000).unref();
        resolve && resolve();
      });
    });
  }
}

StartCommand.addPath("start");
StartCommand.addOption("noView", Command.Boolean("--no-view"));
StartCommand.addOption("browser", Command.Boolean("--browser"));

module.exports = StartCommand;
