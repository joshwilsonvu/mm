"use strict";

const { cli } = require("snowpack");

module.exports = function start() {
  return cli(["node", "mm", "dev", "--reload", "--verbose"]);
};
