'use strict';

const esm = require("esm");
const esmRequire = esm(module);

let cached;

// Load and normalize the config file
module.exports = function loadConfig(configPath) {
  if (cached) {
    return cached;
  }

  const defaults = {
    address: "localhost",
    port: 8080,
    kioskmode: false,
    electronOptions: {},
    ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],

    language: "en",
    timeFormat: 24,
    units: "metric",
    zoom: 1,
    customCss: "css/custom.css",
  };
  let rawConfig = {};
  try {
    rawConfig = esmRequire(configPath);
  } catch(err) {
    if (err.code === "MODULE_NOT_FOUND") {
      console.warn(`Config file ${configPath} not found, using defaults.`);
    } else {
      throw err;
    }
  }
  let config = Object.assign({}, defaults, rawConfig);
  config.port = process.env.MM_PORT || config.port;
  config.address = config.address || null;
  checkDeprecatedConfig(config);
  cached = config;
  return config;
}

function checkDeprecatedConfig(config) { }