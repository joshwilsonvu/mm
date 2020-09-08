"use strict";

const createServer = require("../shared/create-server");
const fs = require("fs");
const openBrowser = require("react-dev-utils/openBrowser");
const keypress = require("../shared/keypress");

module.exports = async function () {
  // Force production mode
  process.env.NODE_ENV = "production";

  const paths = this.context.paths();
  const config = this.context.config();
  const url = `http${config.useHttps ? "s" : ""}://${config.address}:${
    config.port
  }`;

  if (
    !fs.existsSync(paths.appBuild) ||
    fs.readdirSync(paths.appBuild).length === 0
  ) {
    console.info(`No files found in ${paths.appBuild}. Building...`);
    await this.cli.run(["build"]);
  } else if (this.rebuild) {
    console.info(`Rebuilding files to ${paths.appBuild} ...`);
    await this.cli.run(["build"]);
  }

  let server = await createServer(config, paths);
  server.listen();
  console.success("Listening on", url);
  console.info("Press 'q' to quit.");

  const kp = keypress();
  kp.on("q", () => process.kill(process.pid, "SIGINT"));

  if (this.browser) {
    openBrowser(config.url);
  } else if (this.view) {
    const window = Window(config, { dev: true });
    await window.open();
  }
  return new Promise((resolve) => {
    process.once("SIGINT", () => {
      setTimeout(() => process.exit(0), 1000).unref();
      kp.done();
      resolve();
    });
  });
};
