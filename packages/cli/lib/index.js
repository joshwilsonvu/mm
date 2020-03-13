const path = require("path");

const esm = require("esm");
const esmRequire = esm(module);

console.log(process.cwd());

const paths = {
  cwd: resolveApp("."),
  appModules: resolveApp("modules"),
  appModulesDefault: resolveApp("modules", "default"),
  appBuild: resolveApp("build"),
  appConfigJs: process.env.MM_CONFIG_FILE || resolveApp("config", "config.js"),
  appIndexHtml: resolveApp("index.html"),
};

module.exports = function cli(argv) {
  const command = argv.command;
  let config = loadConfig();
  
  switch(command) {
    case 'dev':
      process.env.NODE_ENV = 'development';
      return require('./dev')({
        paths,
        config,
        argv
      });
    case 'build':
      process.env.NODE_ENV = 'production';
      return require('./build')({
        paths,
        config,
        argv
      })
    case 'serve':
      break;
    default:
      break;
  }
}

function loadConfig() {
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
  const rawConfig = esmRequire(paths.appConfigJs);
  let config = Object.assign({}, defaults, rawConfig);
  config.port = process.env.MM_PORT || config.port;
  config.address = config.address || null;
  checkDeprecatedConfig(config);
  return config;
}


function resolveApp(...p) {
  return path.resolve(process.cwd(), ...p);
}

function checkDeprecatedConfig(config) { }

