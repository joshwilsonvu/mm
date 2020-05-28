
/**
 * The Babel config used by babel-loader (client) and babel-register (server).
 */
exports.config = (paths, mode) => ({
  root: paths.cwd,
  babelrc: false,
  configFile: false,
  compact: mode === "production",
  presets: [
    require.resolve("babel-preset-react-app")
  ],
  plugins: [],
  overrides: [
    {
      include: paths.appModules,
      plugins: [
        require.resolve("@mm/babel-plugin-transform-mm2")
      ]
    },
    {
      include: paths.appConfig,
      plugins: [
        require.resolve("@mm/babel-plugin-transform-config")
      ]
    }
  ],
  sourceMaps: true
});

/**
 * Modifies `require` so that paths.appModules and paths.appConfig are transpiled with the
 * same configuration as the frontend. There is an upfront performance penalty for these
 * files, but it's acceptable even in "production" mode because so few files will be transpiled.
 */
exports.register = (paths, mode = "development") => {
  const config = exports.config(paths, mode);
  // Convert import/export to require/module.exports, required for node but not for webpack
  config.plugins.push(require.resolve("babel-plugin-transform-es2015-modules-commonjs"));
  require("@babel/register")({
    only: [
      f => (f.includes(paths.appModules) || f.includes(paths.appConfig)) && !f.includes(".yarn"),
    ],
    extensions: paths.extensions,
    ...config,
  });
  exports.register = () => {}; // don't register twice
}