const paths = require("./paths");

/**
 * The Babel config used by babel-register (server).
 */
const config = {
  root: paths.cwd,
  babelrc: false,
  configFile: false,
  presets: [
    require.resolve("@babel/preset-typescript"),
    require.resolve("@babel/preset-react"),
  ],
  plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
  only: [paths.modules, paths.config],
  overrides: [
    {
      include: paths.config,
      plugins: [
        [
          require.resolve("../snowpack/babel-plugin-transform-config"),
          { modulesPath: paths.modules },
        ],
      ],
    },
  ],
  comments: true,
  extensions: paths.extensions,
  cache: false,
};

// Modifies `require` so that paths.modules and paths.config are transpiled with the
// same configuration as the frontend. There is an upfront performance penalty for these
// files, but it's acceptable even in "production" mode because so few files will be transpiled.
require("@babel/register")(config);
