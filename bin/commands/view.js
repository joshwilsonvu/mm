"use strict";

const createWindow = require("../shared/create-window");
const keypress = require("../shared/keypress");

module.exports = function () {
  const config = require("../shared/config");
  if (this.address) {
    config.address = this.address;
  }
  if (this.port) {
    config.port = this.port;
  }
  const url = this.url || config.url;
  console.info("Viewing", url);
  const window = createWindow(config);
  window.open();

  const kp = keypress();
  kp.on("q", () => process.kill(process.pid, "SIGINT"));
  console.info("Press 'q' to quit.");

  return new Promise((resolve) => {
    process.on("SIGINT", () => {
      setTimeout(() => process.exit(0), 1000).unref();
      kp.done();
      resolve();
    });
  });
};
