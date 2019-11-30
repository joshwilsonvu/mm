const path = require("path");

// Import the user's configuration at compile time.
// To use a different file, fill config.js with `module.exports = require("path/to/configuration/file")`
const userConfig = require("./userconfig/config");

// Warn about deprecated options
const deprecatedOptions = ["kioskmode"];
let usedDeprecated = deprecatedOptions.filter(o => userConfig.hasOwnProperty(o));
if (usedDeprecated.length > 0) {
  console.warn(`WARNING! Your config is using deprecated options: ${usedDeprecated.join(", ")}. Check README and CHANGELOG for more up-to-date ways of getting the same functionality.`);
}

// replace global env configuration
const env = {
  root_path: path.resolve(__dirname + "/../"),
  mmPort: process.env.MM_PORT,
  configuration_file: process.env.MM_CONFIG_FILE,
};

// Set up default config
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

  modules: [
    {
      module: "updatenotification",
      position: "top_center"
    },
    {
      module: "helloworld",
      position: "upper_third",
      classes: "large thin",
      config: {
        text: "Magic Mirror<sup>2</sup>"
      }
    },
    {
      module: "helloworld",
      position: "middle_center",
      config: {
        text: "Please create a config file."
      }
    },
    {
      module: "helloworld",
      position: "middle_center",
      classes: "small dimmed",
      config: {
        text: "See README for more information."
      }
    },
    {
      module: "helloworld",
      position: "middle_center",
      classes: "xsmall",
      config: {
        text: "If you get this message while your config file is already<br>created, your config file probably contains an error.<br>Use a JavaScript linter to validate your file."
      }
    },
    {
      module: "helloworld",
      position: "bottom_bar",
      classes: "xsmall dimmed",
      config: {
        text: "www.michaelteeuw.nl"
      }
    },
  ],

  paths: {
    modules: "modules",
    vendor: "vendor"
  },
};

// Join the user-provided configuration with the defaults
const config = {...defaults, ...env, ...userConfig};
module.exports = config;

