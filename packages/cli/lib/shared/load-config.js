'use strict';

const defaults = {
  address: "",
  port: 8080,
  kioskmode: false,
  electronOptions: {},
  ipWhitelist: [],
  useHttps: false,
  httpsPrivateKey: "",
  httpsCertificate: "",

  language: "en",
  timeFormat: 24,
  units: "metric",
  zoom: 1,
};

// Load and normalize the config file
module.exports = function loadConfig(configPath) {
  let rawConfig = require(configPath);
  if (rawConfig.default) {
    rawConfig = rawConfig.default; // export default
  }
  let config = Object.assign({}, defaults, rawConfig);
  config.port = process.env.MM_PORT || config.port;
  // add `url` for convenience
  config.url = `${config.useHttps ? "https" : "http"}://${config.address || "127.0.0.1"}:${config.port}/`;
  checkDeprecatedConfig(config);
  return config;
}

function checkDeprecatedConfig(config) { }
