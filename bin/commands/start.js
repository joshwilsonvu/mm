"use strict";

const { cli } = require("snowpack");

module.exports = async () => {
  // Run the Snowpack dev server
  return cli(["dev"]);
};
