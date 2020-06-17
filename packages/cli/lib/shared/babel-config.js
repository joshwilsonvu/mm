
/**
 * The Babel config used by babel-loader (client) and babel-register (server).
 */
exports.config = (paths) => ({
  root: paths.cwd,
  babelrc: false,
  configFile: false,
  compact: false,
  presets: [
    require.resolve("babel-preset-react-app")
  ],
  plugins: [],
  overrides: [
    paths.appModules && {
      include: paths.appModules,
      plugins: [
        require.resolve("@mm/babel-plugin-transform-mm2")
      ]
    },
    paths.appConfig && {
      include: paths.appConfig,
      plugins: [
        [require.resolve("@mm/babel-plugin-transform-config"), { modulesPath: paths.appModules }]
      ]
    }
  ].filter(Boolean),
  comments: true,
  sourceMaps: true,
  inputSourceMap: true,
});

let registered = false;

/**
 * Modifies `require` so that paths.appModules and paths.appConfig are transpiled with the
 * same configuration as the frontend. There is an upfront performance penalty for these
 * files, but it's acceptable even in "production" mode because so few files will be transpiled.
 */
exports.register = (paths) => {
  if (!registered && paths.appModules && paths.appConfig) {
    const config = exports.config(paths);
    // Convert import/export to require/module.exports, required for node but not for webpack
    config.plugins.push(require.resolve("babel-plugin-transform-es2015-modules-commonjs"));
    require("@babel/register")({
      only: [
        f => !f.includes(".yarn") && (f.includes(paths.appModules) || f.includes(paths.appConfig)),
      ],
      extensions: paths.extensions,
      ...config,
    });
    registered = true; // don't register twice
  }
}
