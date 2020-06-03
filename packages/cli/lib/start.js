'use strict';

const fs = require("fs");
const createCompiler = require("./shared/create-compiler");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const openBrowser = require("react-dev-utils/openBrowser");

const Server = require("./shared/server");
const Window = require("./shared/window");

module.exports = start;
async function start() {
  const webpackConfig = require("./shared/webpack.config")({
    mode: "development",
    paths: this.paths,
  });
  const compiler = createCompiler({
    config: webpackConfig,
    useTypeScript: fs.existsSync(this.paths.appTsConfig),
  });

  const devMiddleware = webpackDevMiddleware(compiler, {
    logLevel: "silent",
  });
  const hotMiddleware = webpackHotMiddleware(compiler, { log: false });

  const server = await Server(this.config, this.paths, [(req, res, next) => {
    console.log("hot");
    hotMiddleware(req, res, next);
  }, devMiddleware]);
  server.listen();
  if (!this.options.browser && !this.options.serveronly) {
    const window = Window(this.config, this.options);
    await window.open();
  } else if (this.options.browser) {
    openBrowser(this.config.url);
  }

  process.on("SIGINT", () => {
    devMiddleware.close();
  });
}

