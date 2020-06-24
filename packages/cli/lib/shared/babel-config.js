/**
 * The Babel config used by babel-loader (client) and babel-register (server).
 */
function config(paths) {
  return {
    root: paths.cwd,
    babelrc: false,
    configFile: false,
    compact: false,
    presets: [require.resolve("babel-preset-react-app")],
    plugins: [],
    overrides: [
      paths.appModules && {
        include: paths.appModules,
        plugins: [
          [
            require.resolve("@mm/babel-plugin-transform-mm2"),
            {
              imports: ["Module", "Log", "moment"],
            },
          ],
        ],
      },
      paths.appConfig && {
        include: paths.appConfig,
        plugins: [
          [
            require.resolve("@mm/babel-plugin-transform-config"),
            { modulesPath: paths.appModules },
          ],
        ],
      },
    ].filter(Boolean),
    comments: true,
    sourceMaps: true,
    inputSourceMap: true,
  };
}

let registered = false;

/**
 * Modifies `require` so that paths.appModules and paths.appConfig are transpiled with the
 * same configuration as the frontend. There is an upfront performance penalty for these
 * files, but it's acceptable even in "production" mode because so few files will be transpiled.
 */
function register(paths) {
  if (!registered && paths.appModules && paths.appConfig) {
    const c = config(paths);
    // Convert import/export to require/module.exports, required for node but not for webpack
    c.plugins.push(
      require.resolve("babel-plugin-transform-es2015-modules-commonjs")
    );
    require("@babel/register")({
      ...c,
      only: [
        (f) =>
          !f.includes(".yarn") &&
          (f.startsWith(paths.appModules) || f.startsWith(paths.appConfig)),
      ],
      extensions: paths.extensions,
      cache: false, // process.env.NODE_ENV === "production"
    });
    registered = true; // don't register twice
  }
}

module.exports = {
  config,
  register,
};
