'use strict';

const fs = require("fs");
const createCompiler = require("./shared/create-compiler");
const webpackDevMiddleware = require("webpack-dev-middleware");
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

  const server = await Server(this.config, this.paths, devMiddleware);
  server.listen();
  if (!this.options.browser) {
    const window = Window(this.config, this.options);
    await window.open();
  } else {
    openBrowser(this.config.url);
  }

  process.on("SIGINT", () => {
    devMiddleware.close();
  });
}

