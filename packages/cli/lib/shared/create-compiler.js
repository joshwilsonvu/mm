"use strict";

const webpack = require("webpack");
const chalk = require("chalk");
//const forkTsCheckerWebpackPlugin = require("react-dev-utils/ForkTsCheckerWebpackPlugin");
const formatWebpackMessages = require("react-dev-utils/formatWebpackMessages");
//const typescriptFormatter = require("react-dev-utils/typescriptFormatter");

module.exports = createCompiler;
function createCompiler({ config }) {
  let compiler = webpack(config);

  // "invalid" event fires when you have changed a file, and webpack is
  // recompiling a bundle. If you refresh, it'll wait instead of serving the old one.
  // "invalid" is short for "bundle invalidated", it doesn't imply any errors.
  compiler.hooks.watchRun.tap("buildStart", () => {
    handlers.invalid();
  });

  // "done" event fires when webpack has finished recompiling the bundle.
  // Whether or not you have warnings or errors, you will get this event.
  compiler.hooks.done.tap("done", async (stats) => {
    // We have switched off the default webpack output
    // so we are going to "massage" the warnings and errors and present
    // them in a readable focused way.
    // We only construct the warnings and errors for speed:
    // https://github.com/facebook/create-react-app/issues/4492#issuecomment-421959548
    const statsData = stats.toJson({
      all: false,
      warnings: true,
      errors: true,
    });

    const messages = formatWebpackMessages(statsData);
    // console.log(JSON.stringify(messages, null, 2));
    if (messages.errors.length > 0) {
      // If errors exist, only show errors, and only show the first error.
      messages.errors.length = 1;
      handlers.error(messages);
      return;
    } else if (messages.warnings.length > 0) {
      // Show warnings if no errors were found.
      handlers.warning(messages);
    } else {
      handlers.success();
    }
  });

  return compiler;
}

const handlers = {
  invalid() {
    console.info("Compiling...");
  },
  success() {
    console.success("Compiled successfully!");
  },
  warning(messages) {
    console.warn(
      chalk.bold.yellow("Compiled with warnings.\n"),
      messages.warnings.join("\n\n"),
      "\n"
    );
  },
  error(messages) {
    console.error(
      chalk.bold.red("Failed to compile.\n"),
      messages.errors[0],
      "\n"
    );
  },
};
