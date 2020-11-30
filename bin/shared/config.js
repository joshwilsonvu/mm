require("./babel").register();
const paths = require("./paths");
const { initializeConfig } = require("../../dist/types.js");

// allow ESM and typescript for MagicMirror config
const rawConfig = require(paths.config);
const initializedConfig = initializeConfig(rawConfig);

module.exports = initializedConfig;
