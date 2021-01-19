"use strict";

const fs = require("fs-extra");
const path = require("path");
const express = require("express");
const SocketIO = require("socket.io");
const { IpFilter, IpDeniedError } = require("express-ipfilter");
const morgan = require("morgan");
const helmet = require("helmet");
const chalk = require("chalk");
const findModules = require("./find-modules");

/**
 * Creates a express/socket.io server that serves MagicMirror files and runs node helpers.
 */
module.exports = function createServer() {
  return {
    app,
    io,
  };
};

