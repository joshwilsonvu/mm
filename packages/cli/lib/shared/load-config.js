'use strict';

const defaults = {
  address: "127.0.0.1",
  port: 8080,
  kioskmode: false,
  electronOptions: {},
  ipAllowlist: [],
  useHttps: false,
  httpsPrivateKey: "",
  httpsCertificate: "",

  language: "en",
  timeFormat: 24,
  units: "metric",
  zoom: 1,
};

// Load and normalize the config file
module.exports = function loadConfig(configPath, overrides = {}) {
  let rawConfig = {};
  if (configPath) {
    rawConfig = require(configPath);
    if (rawConfig.default) {
      rawConfig = rawConfig.default; // export default
    }
  }
  // migrate to ipAllowlist
  rawConfig.ipAllowlist.push(...(rawConfig.ipWhitelist || []));
  delete rawConfig.ipWhitelist;

  let config = Object.assign({}, defaults, rawConfig);
  for (let key of Object.keys(overrides)) {
    if (overrides[key] !== undefined) {
      config[key] = overrides[key];
    }
  }
  // add `url` for convenience
  if (!config.url) {
    config.url = `${config.useHttps ? "https" : "http"}://${config.address || "127.0.0.1"}:${config.port}/`;
  }
  checkDeprecatedConfig(config);
  return config;
}

function checkDeprecatedConfig(config) { }
