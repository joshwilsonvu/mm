"use strict";

const createWindow = require("../shared/create-window");

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

  console.info("Press 'ctrl+C' to quit.");

  return new Promise((resolve) => {
    process.on("SIGINT", () => {
      setTimeout(() => process.exit(0), 1000).unref();
      resolve();
    });
  });
};
