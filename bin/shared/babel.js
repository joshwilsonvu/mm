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
  only: [paths.modules, paths.config /* paths.src */],
  overrides: [
    {
      include: paths.config,
      plugins: [
        [
          require.resolve("./babel-plugin-transform-config"),
          { modulesPath: paths.modules, extensions: paths.extensions },
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
