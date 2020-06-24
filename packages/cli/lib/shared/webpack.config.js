"use strict";

const fs = require("fs");
const webpack = require("webpack");
const PnpWebpackPlugin = require("pnp-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleNotFoundPlugin = require("react-dev-utils/ModuleNotFoundPlugin");
const CaseSensitivePathsPlugin = require("case-sensitive-paths-webpack-plugin");
const postcssNormalize = require("postcss-normalize");

const ignoreRegex = /node_modules|\.yarn|@babel(?:\/|\\{1,2})runtime/;

module.exports = webpackConfig;
function webpackConfig({ mode = "development", paths, analyze }) {
  if (!paths.appIndex) return null;

  // Check if TypeScript is setup
  const useTypeScript = fs.existsSync(paths.appTsConfig);

  return {
    mode: mode,
    context: __dirname,
    entry: [
      mode !== "production" && "webpack-hot-middleware/client?noInfo=true",
      paths.appIndex,
    ].filter(Boolean),
    output: {
      path: paths.appBuild,
    },
    resolve: {
      // This allows you to set a fallback for where webpack should look for modules.
      // We placed these paths second because we want `node_modules` to "win"
      // if there are any conflicts. This matches Node resolution mechanism.
      modules: ["node_modules", paths.appNodeModules],
      extensions: paths.extensions,
      plugins: [
        // Adds support for installing with Plug'n'Play, leading to faster installs and adding
        // guards against forgotten dependencies and such.
        PnpWebpackPlugin,
      ],
    },
    resolveLoader: {
      plugins: [
        // Also related to Plug'n'Play, but this time it tells webpack to load its loaders
        // from the current package.
        PnpWebpackPlugin.moduleLoader(module),
      ],
    },
    optimization: {
      noEmitOnErrors: true,
      // Automatically split vendor and commons
      // https://twitter.com/wSokra/status/969633336732905474
      // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
      splitChunks: {
        chunks: "all",
        name: false,
      },
      // Keep the runtime chunk separated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      // https://github.com/facebook/create-react-app/issues/5358
      runtimeChunk: {
        name: (entrypoint) => `runtime-${entrypoint.name}`,
      },
    },
    module: {
      strictExportPresence: true,
      rules: [
        // Disable require.ensure as it's not a standard language feature.
        { parser: { requireEnsure: false } },
        /* Don't lint as part of the build process for a 250% performance boost. */
        {
          // "oneOf" will traverse all following loaders until on will
          // match the requirements. When no loader matches it will fall
          // back to the "file" loader at the end of the loader list.
          oneOf: [
            // Compile JS and TS with Babel, which includes transformations from @mm/babel-plugin-*.
            // Ensure dependencies are not compiled.
            {
              test: /\.(js|mjs|jsx|ts|tsx)$/,
              exclude: ignoreRegex,
              rules: [
                {
                  loader: require.resolve("babel-loader"),
                  options: {
                    //cacheDirectory: true,
                    cacheCompression: false,
                    ...require("./babel-config").config(paths, mode),
                  },
                },
                useTypeScript && {
                  test: /\.(ts|tsx)$/,
                  loader: require.resolve("ts-loader"),
                  options: {
                    //...(process.versions.pnp && require("./pnpTs.js")),
                    silent: true,
                    configFile: paths.appTsConfig,
                    errorFormatter: require("./formatter").ts,
                    // Override certain compiler options for more predictable output
                    compilerOptions: {
                      target: "ESNext",
                      module: "ES6",
                      incremental: true,
                      isolatedModules: true,
                      jsx: "preserve",
                      declaration: false,
                      sourceMap: false,
                      noEmit: false,
                      types: [],
                    },
                  },
                },
              ].filter(Boolean),
            },
            // "postcss" loader applies autoprefixer to our CSS.
            // "css" loader resolves paths in CSS and adds assets as dependencies.
            // "style" loader turns CSS into JS modules that inject <style> tags.
            // In production, we use MiniCSSExtractPlugin to extract that CSS
            // to a file, but in development "style" loader enables hot editing
            // of CSS.
            // By default we support CSS Modules with the extension .module.css
            {
              test: /\.css$/,
              exclude: /\.module\.css$/,
              use: getStyleLoaders({
                importLoaders: 1,
              }),
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },
            // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
            // using the extension .module.css
            {
              test: /\.module\.css$/,
              use: getStyleLoaders({
                importLoaders: 1,
                modules: true,
              }),
            },
            // Opt-in support for SASS (using .scss or .sass extensions).
            // By default we support SASS Modules with the
            // extensions .module.scss or .module.sass
            {
              test: /\.s[ac]ss$/,
              exclude: /\.module\.s[ac]ss$/,
              use: getStyleLoaders(
                {
                  importLoaders: 3,
                },
                require.resolve("sass-loader")
              ),
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },
            // Adds support for CSS Modules, but using SASS
            // using the extension .module.scss or .module.sass
            {
              test: /\.module\.s[ac]ss$/,
              use: getStyleLoaders(
                {
                  importLoaders: 3,
                  modules: true,
                },
                require.resolve("sass-loader")
              ),
            },
            // "file" loader makes sure those assets get served by WebpackDevServer.
            // When you `import` an asset, you get its (virtual) filename.
            // In production, they would get copied to the `build` folder.
            // This loader doesn't use a "test" so it will catch all modules
            // that fall through the other loaders.
            {
              loader: require.resolve("file-loader"),
              // Exclude `js` files to keep "css" loader working as it injects
              // its runtime that would otherwise be processed through "file" loader.
              // Also exclude `html` and `json` extensions so they get processed
              // by webpacks internal loaders.
              exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
              options: {
                name: "static/media/[name].[hash:8].[ext]",
              },
            },
          ],
        },
      ],
    },
    plugins: [
      // Generates an `index.html` file with the <script> injected.
      new HtmlWebpackPlugin({
        inject: true,
        template: paths.appIndexHtml,
      }),
      // This gives some necessary context to module not found errors, such as
      // the requesting resource.
      new ModuleNotFoundPlugin(paths.cwd),
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      mode !== "production" && new CaseSensitivePathsPlugin(),
      // This is necessary to emit hot updates
      mode !== "production" && new webpack.HotModuleReplacementPlugin(),
      new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(mode),
      }),
      // Moment.js is an extremely popular library that bundles large locale files
      // by default due to how webpack interprets its code. This is a practical
      // solution that requires the user to opt into importing specific locales.
      // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
      // You can remove this if you don't use Moment.js:
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      // TypeScript type checking
      // useTypeScript &&
      //   new ForkTsCheckerWebpackPlugin({
      //     typescript: require.resolve("typescript"),
      //     async: mode !== "production",
      //     useTypescriptIncrementalApi: true,
      //     //checkSyntacticErrors: true,
      //     resolveModuleNameModule: process.versions.pnp
      //       ? require.resolve("./pnpTs.js")
      //       : undefined,
      //     resolveTypeReferenceDirectiveModule: process.versions.pnp
      //       ? require.resolve("./pnpTs.js")
      //       : undefined,
      //     tsconfig: paths.appTsConfig,
      //     reportFiles: [
      //       "**",
      //       "!**/__tests__/**",
      //       "!**/?(*.)(spec|test).*",
      //       "!**/src/setupProxy.*",
      //       "!**/src/setupTests.*",
      //       "!**/.yarn/**",
      //       "!**/node_modules/**",
      //     ],
      //     silent: true,
      //     // The formatter is invoked directly in WebpackDevServerUtils during development
      //   }),
      // If analyze is true, open up a bundle analysis page after the build
      analyze &&
        new (require("webpack-bundle-analyzer").BundleAnalyzerPlugin)({
          analyzerMode: "static",
        }),
    ].filter(Boolean),
    stats: false,
    bail: mode === "production",
    devtool: "cheap-module-source-map",
    performance: {
      maxEntrypointSize: 1024 * 1024,
      maxAssetSize: 1024 * 1024,
      hints: mode === "production" ? "warning" : false,
    },
    infrastructureLogging: {
      level: "none",
    },
    node: {
      // Include Node.js __dirname/__filename even for browser files
      __dirname: true,
      __filename: true,
    },
    watchOptions: {
      aggregateTimeout: 1000,
      ignored: ignoreRegex,
    },
  };
}

// common function to get style loaders
function getStyleLoaders(cssOptions, preProcessor) {
  const loaders = [
    require.resolve("style-loader"),
    {
      loader: require.resolve("css-loader"),
      options: cssOptions,
    },
    {
      // Options for PostCSS as we reference these options twice
      // Adds vendor prefixing based on your specified browser support in
      // package.json
      loader: require.resolve("postcss-loader"),
      options: {
        // Necessary for external CSS imports to work
        // https://github.com/facebook/create-react-app/issues/2677
        ident: "postcss",
        plugins: () => [
          require("postcss-flexbugs-fixes"),
          require("postcss-preset-env")({
            autoprefixer: {
              flexbox: "no-2009",
            },
            stage: 3,
          }),
          // Adds PostCSS Normalize as the reset css with default options,
          // so that it honors browserslist config in package.json
          // which in turn let's users customize the target behavior as per their needs.
          postcssNormalize(),
        ],
      },
    },
  ];
  if (preProcessor) {
    loaders.push(
      {
        loader: require.resolve("resolve-url-loader"),
      },
      {
        loader: preProcessor,
        options: {
          sourceMap: true,
        },
      }
    );
  }
  return loaders;
}
