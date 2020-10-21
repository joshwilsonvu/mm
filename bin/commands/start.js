"use strict";

const path = require("path");
const { cli } = require("snowpack");
const { port } = require("../shared/config");

module.exports = () => cli(["node", "mm", "dev"]);
