'use strict';

const webpack = require("webpack");
const chalk = require("chalk");
const forkTsCheckerWebpackPlugin = require("react-dev-utils/ForkTsCheckerWebpackPlugin");
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const typescriptFormatter = require('react-dev-utils/typescriptFormatter');


module.exports = createCompiler;
function createCompiler({ config, useTypeScript, handlers }) {
  handlers = {...defaultOutputHandlers, ...handlers};
  let compiler = webpack(config);

  // "invalid" event fires when you have changed a file, and webpack is
  // recompiling a bundle. WebpackDevServer takes care to pause serving the
  // bundle, so if you refresh, it'll wait instead of serving the old one.
  // "invalid" is short for "bundle invalidated", it doesn't imply any errors.
  compiler.hooks.invalid.tap('invalid', () => {
    handlers.invalid();
  });

  let tsMessagesPromise;
  let tsMessagesResolver;

  if (useTypeScript) {
    compiler.hooks.beforeCompile.tap('beforeCompile', () => {
      tsMessagesPromise = new Promise(resolve => {
        tsMessagesResolver = msgs => resolve(msgs);
      });
    });

    forkTsCheckerWebpackPlugin
      .getCompilerHooks(compiler)
      .receive.tap('afterTypeScriptCheck', (diagnostics) => {
        const format = message => `${message.file}\n${typescriptFormatter(message)}`;
        tsMessagesResolver({
          errors: diagnostics.filter(msg => msg.severity === 'error').map(format),
          warnings: diagnostics.filter(msg => msg.severity === 'warning').map(format),
        });
      });
  }

  // "done" event fires when webpack has finished recompiling the bundle.
  // Whether or not you have warnings or errors, you will get this event.
  compiler.hooks.done.tap('done', async stats => {
    // We have switched off the default webpack output in WebpackDevServer
    // options so we are going to "massage" the warnings and errors and present
    // them in a readable focused way.
    // We only construct the warnings and errors for speed:
    // https://github.com/facebook/create-react-app/issues/4492#issuecomment-421959548
    const statsData = stats.toJson({
      all: false,
      warnings: true,
      errors: true,
    });

    if (useTypeScript && statsData.errors.length === 0) {
      const messages = await tsMessagesPromise;

      statsData.errors.push(...messages.errors);
      statsData.warnings.push(...messages.warnings);
    }

    const messages = formatWebpackMessages(statsData);
    const isSuccessful = !messages.errors.length && !messages.warnings.length;
    if (isSuccessful) {
      handlers.success();
    } else if (messages.errors.length > 0) {
      // If errors exist, only show errors, and only show the first error.
      messages.errors.length = 1;
      handlers.error(messages);
      return;
    } else {
      // Show warnings if no errors were found.
      handlers.warning(messages);
    }
  });

  if (handlers.progress) {
    new webpack.ProgressPlugin(handlers.progress.bind(handlers)).apply(compiler);
  }

  return compiler;
}

const defaultOutputHandlers = {
  invalid() {
    console.log('Compiling...');
  },
  success() {
    console.log(chalk.green('Compiled successfully!'));
  },
  warning(messages) {
    console.log(chalk.yellow('Compiled with warnings.\n'));
    console.log(messages.warnings.join('\n\n'));

    // Teach some ESLint tricks.
    console.log(`\nSearch for the ${chalk.underline(chalk.yellow('keywords'))} to learn more about each warning.`);
    console.log(`To ignore, add ${chalk.cyan('// eslint-disable-next-line')} to the line before.\n`);
  },
  error(messages) {
    console.log(chalk.red('Failed to compile.\n'));
    console.log(messages.errors[0]);
  }
}