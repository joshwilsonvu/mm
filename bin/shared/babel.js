const paths = require("./paths");

/**
 * The Babel config used by babel-register (server) and @snowpack/plugin-babel.
 */
const config = {
  root: paths.cwd,
  babelrc: false,
  configFile: false,
  presets: [
    require.resolve("@babel/preset-react"),
    require.resolve("@babel/preset-typescript"),
  ],
  only: [paths.modules, paths.config, paths.src],
  overrides: [
    {
      include: paths.config,
      plugins: [
        [
          require.resolve("./babel-plugin-transform-config"),
          { modulesPath: paths.modules },
        ],
      ],
    },
    {
      include: paths.modules,
      plugins: [require.resolve("./babel-plugin-transform-mm2")],
    },
  ],
  comments: true,
};
module.exports.config = config;

// Modifies `require` so that paths.modules and paths.config are transpiled with the
// same configuration as the frontend. There is an upfront performance penalty for these
// files, but it's acceptable even in "production" mode because so few files will be transpiled.
let registered = false;
module.exports.register = () => {
  if (!registered) {
    require("@babel/register")({
      ...config,
      plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
      extensions: paths.extensions,
      cache: false,
    });
    registered = true;
  }
};
