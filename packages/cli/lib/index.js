#!/usr/bin/env node

const yargs = require("yargs");
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const logSymbols = require("log-symbols");
const clear = require("clear");
const loadConfig = require("./shared/load-config")

const webpack = require("webpack");
const PnpWebpackPlugin = require("pnp-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const postcssNormalize = require("postcss-normalize");

const commands = [
  {
    command: "start",
    describe: "Start serving MagicMirror in development mode",
    builder: y => y.options({
      serveronly: {
        describe: "don't open an electron app window, only serve for a web browser"
      }
    })
  },
  {
    command: "build",
    describe: "Create an optimized build",
  },
  {
    command: "serve",
    describe: "Run MagicMirror from a build",
    builder: y => y.options({
      serveronly: {
        describe: "don't open an electron app window, only serve for a web browser",
        conflicts: "clientonly",
      },
      clientonly: {
        describe: "only open an electron app window, and use another server with --address and --port",
        conflicts: "serveronly",
      },
      build: {
        describe: "if MagicMirror hasn't been built, run a build before serving",
        conflicts: "clientonly",
      },
      address: {
        type: "string",
        describe: "the IP address of the server to connect to",
        implies: "clientonly",
      },
      port: {
        type: "number",
        describe: "the port of the server to connect to",
        implies: "clientonly",
      }
    })
  }
]

commands
  .reduce((yargs, command) => yargs.command(command), yargs)
  .scriptName("mm")
  .option("cwd", { type: "string", describe: "run mm in this directory" })
  .option("config", { type: "string", describe: "the path to the MagicMirror config file" })
  .help()
  .showHelpOnFail(false)
  .version(require("../package.json").version)
  .epilogue("Run $0 <command> --help for more informaton about each command.")

class CLI {
  constructor(...argv) {
    const options = yargs.parse(argv);
    if (!options || !options._.length) {
      return;
    }
    // handle cwd option, only if run as standalone
    if (options.cwd && require.main === module && fs.existsSync(options.cwd)) {
      process.chdir(options.cwd);
    }

    this.options = options;
    this.paths = {
      cwd: path.resolve("."),
      appModules: path.resolve("modules"),
      appModulesDefault: path.resolve("modules", "default"),
      appBuild: path.resolve("build"),
      appConfigJs: (options.config && path.resolve(options.config)) || process.env.MM_CONFIG_FILE || path.resolve("config", "config.js"),
      appIndexJs: path.resolve("index.js"),
      appPackageJson: path.resolve("package.json"),
      appNodeModules: path.resolve("node_modules"),
    };
    this.config = loadConfig(this.paths.appConfigJs)
  }

  run() {
    // run the command
    const command = this.options && this.options._[0];
    if (command && commands.map(c => c.command).includes(command)) {
      const onError = err => {
        console.log(logSymbols.error, this.formatError(err));
        throw err;
      }
      let result;
      try {
        // given a valid command, require the matching file in this directory and call the exported function as a method
        const method = require(`./${command}`);
        result = method.apply(this);
      } catch (err) {
        return onError(err);
      }
      // result may be a promise, also handle asynchronous errors
      if (result.catch) {
        result.catch(err => onError(err));
      }
      return result;
    } else {
      yargs.showHelp(console.log);
      return;
    }
  }

  formatBundlerEvents(bundler, includeError = false) {
    bundler.on("buildStart", () => {
      if (process.stdout.isTTY) {
        clear();
      }
      console.log(logSymbols.info, "Building...");
    });
    bundler.on("bundled", () => {
      console.log(logSymbols.success, `MagicMirror built ${chalk.bold.green("successfully")}!`);
    });
    if (includeError) {
      bundler.on("buildError", (err) => {
        console.log(logSymbols.error, this.formatError(err));
      });
    }
  }

  formatError(err) {
    let { name = "", fileName = "", loc, codeFrame = "", highlightedCodeFrame = "", message = "", stack = "" } = err;
    if (this.paths.cwd) {
      // omit device-specific portion of paths
      const basename = path.basename(this.paths.cwd);
      fileName = fileName && fileName.replace(this.paths.cwd, basename);
      stack = stack && stack.replace(this.paths.cwd, basename)
      message = message && message.replace(this.paths.cwd, basename);
    }
    stack = stack && stack.split("\n").slice(1, 10).map(line => line.match(/node_modules|\(internal\//) ? chalk.gray(line) : line).join("\n");
    message = message && message.replace(/error: /i, "");

    let parts = [];
    if (fileName && loc) {
      parts.push(chalk.bold.red(`${name || "Error"} at ${fileName}:${loc.line}:${loc.column}: `));
    } else {
      parts.push(chalk.bold.red(`${name || "Error"}: `));
    }
    parts.push(chalk.bold.red(`${message}\n\n`));

    if (highlightedCodeFrame && chalk.supportsColor) {
      parts.push(highlightedCodeFrame);
    } else if (codeFrame) {
      parts.push(codeFrame);
    } else if (stack) {
      parts.push(stack);
    }
    parts.push(`\n`)
    return parts.join("");
  }

  preflightCheck(paths = [this.paths.appIndexJs, this.paths.appConfigJs]) {
    paths.forEach(p => {
      if (!fs.existsSync(p)) {
        throw new Error(`Couldn't find ${p}.`)
      }
    });
  }

  webpackConfig({ mode = "development" }) {

    return {
      mode: mode,
      entry: this.paths.appIndexJs,
      output: {
        path: this.paths.appBuild,
      },
      resolve: {
        // This allows you to set a fallback for where webpack should look for modules.
        // We placed these paths second because we want `node_modules` to "win"
        // if there are any conflicts. This matches Node resolution mechanism.
        modules: ["node_modules", this.paths.appNodeModules],
        plugins: [
          // Adds support for installing with Plug'n'Play, leading to faster installs and adding
          // guards against forgotten dependencies and such.
          PnpWebpackPlugin
        ]
      },
      resolveLoader: {
        plugins: [
          // Also related to Plug'n'Play, but this time it tells webpack to load its loaders
          // from the current package.
          PnpWebpackPlugin.moduleLoader(module),
        ],
      },
      strictExportPresence: true,
      optimization: {
        minimize: mode === "production",
      },
      module: {
        rules: [
          // Disable require.ensure as it's not a standard language feature.
          { parser: { requireEnsure: false } },

          // First, run the linter.
          // It's important to do this before Babel processes the JS.
          {
            test: /\.(js|mjs|jsx|ts|tsx)$/,
            enforce: "pre",
            use: [
              {
                options: {
                  cache: true,
                  //formatter: require.resolve('react-dev-utils/eslintFormatter'),
                  eslintPath: require.resolve('eslint'),
                  resolvePluginsRelativeTo: __dirname,
                },
                loader: require.resolve('eslint-loader'),
              },
            ]
          },
          {
            // "oneOf" will traverse all following loaders until on will
            // match the requirements. When no loader matches it will fall
            // back to the "file" loader at the end of the loader list.
            oneOf: [
              {
                test: /\.(js|mjs|jsx|ts|tsx)$/,
                exclude: /node_modules|@babel(?:\/|\\{1,2})runtime/,
                use: "babel-loader",
                options: {
                  cacheDirectory: true,
                  cacheCompression: false,
                  compact: mode === "production",
                }
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
                  'sass-loader'
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
                  'sass-loader'
                ),
              },
              // "file" loader makes sure those assets get served by WebpackDevServer.
              // When you `import` an asset, you get its (virtual) filename.
              // In production, they would get copied to the `build` folder.
              // This loader doesn't use a "test" so it will catch all modules
              // that fall through the other loaders.
              {
                loader: require.resolve('file-loader'),
                // Exclude `js` files to keep "css" loader working as it injects
                // its runtime that would otherwise be processed through "file" loader.
                // Also exclude `html` and `json` extensions so they get processed
                // by webpacks internal loaders.
                exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
                options: {
                  name: 'static/media/[name].[hash:8].[ext]',
                },
              },
            ]
          }
        ]
      },
      plugins: [
        // Generates an `index.html` file with the <script> injected.
        new HtmlWebpackPlugin({
          inject: true,
          template: this.paths.appIndexHtml,
        }),
        // Inlines the webpack runtime script. This script is too small to warrant
        // a network request.
        mode === 'production' && new webpack.InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/runtime-.+[.]js/]),
        // This is necessary to emit hot updates (currently CSS only):
        mode !== 'production' && new webpack.HotModuleReplacementPlugin(),
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify(mode)
        }),
        // Moment.js is an extremely popular library that bundles large locale files
        // by default due to how webpack interprets its code. This is a practical
        // solution that requires the user to opt into importing specific locales.
        // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
        // You can remove this if you don't use Moment.js:
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        // TypeScript type checking
        useTypeScript &&
        new ForkTsCheckerWebpackPlugin({
          typescript: resolve.sync('typescript', {
            basedir: paths.appNodeModules,
          }),
          async: mode !== 'production',
          useTypescriptIncrementalApi: true,
          checkSyntacticErrors: true,
          resolveModuleNameModule: process.versions.pnp
            ? `${__dirname}/pnpTs.js`
            : undefined,
          resolveTypeReferenceDirectiveModule: process.versions.pnp
            ? `${__dirname}/pnpTs.js`
            : undefined,
          tsconfig: paths.appTsConfig,
          reportFiles: [
            '**',
            '!**/__tests__/**',
            '!**/?(*.)(spec|test).*',
            '!**/src/setupProxy.*',
            '!**/src/setupTests.*',
          ],
          silent: true,
          // The formatter is invoked directly in WebpackDevServerUtils during development
          formatter: isEnvProduction ? typescriptFormatter : undefined,
        }),
      ]
    }
  }
}

module.exports = CLI;

// parse command line arguments if this script was run directly,
// and exit the process if an error is thrown
if (require.main === module) {
  let instance = new CLI(...process.argv.slice(2));
  try {
    const result = instance.run();
    if (result && result.then) {
      // end process when the promise is done
      result.then(() => process.exit(0), () => setTimeout(() => process.exit(1), 2500));
    }
    if (typeof result === "function") {
      // begin cleanup on SIGINT
      process.on("SIGINT", () => {
        result();
      });
    }
  } catch (err) {
    console.log(logSymbols.error, instance.formatError(err));
  }
}

// common function to get style loaders
function getStyleLoaders(cssOptions, preProcessor) {
  const loaders = [
    require.resolve('style-loader'),
    {
      loader: require.resolve('css-loader'),
      options: cssOptions,
    },
    {
      // Options for PostCSS as we reference these options twice
      // Adds vendor prefixing based on your specified browser support in
      // package.json
      loader: require.resolve('postcss-loader'),
      options: {
        // Necessary for external CSS imports to work
        // https://github.com/facebook/create-react-app/issues/2677
        ident: 'postcss',
        plugins: () => [
          require('postcss-flexbugs-fixes'),
          require('postcss-preset-env')({
            autoprefixer: {
              flexbox: 'no-2009',
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
        loader: require.resolve('resolve-url-loader'),
      },
      {
        loader: require.resolve(preProcessor),
        options: {
          sourceMap: true,
        },
      }
    );
  }
  return loaders;
};