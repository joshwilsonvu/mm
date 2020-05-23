'use strict';

const fs = require("fs");
const { promisify } = require("util");
const createCompiler = require("./shared/create-compiler");
const webpackDevMiddleware = require("webpack-dev-middleware");

const Server = require("./shared/server");

module.exports = start;
function start() {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }

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
  const server = new Server(this.config, this.paths, devMiddleware);
  server.listen();

  // stop and wait with "await stop()";
  return () => Promise.all([
    //promisify(watching.close.bind(watching)),
    server.stop(),
    promisify(devMiddleware.close.bind(devMiddleware))()
  ]);
}

