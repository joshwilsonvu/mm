#!/usr/bin/env node

const yargs = require("yargs");
const fs = require("fs-extra");
const path = require("path");
const ora = require("ora");
const chalk = require("chalk");
const loadConfig = require("./shared/load-config")

const commands = [
  {
    command: "dev",
    describe: "Start serving MagicMirror in development mode",
    builder: y => y.options({
      serveronly: {
        describe: "don't open an electron app window"
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
  },
  {
    command: "init",
    describe: "Set up MagicMirror in this folder",
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
      yargs.showHelp(help => console.log(help));
      throw new Error("invalid arguments");
    }
    // handle cwd option, only if run as standalone
    if (options.cwd && require.main === module && fs.existsSync(options.cwd)) {
      process.chdir(options.cwd);
    }

    this.options = options;
    this.spinner = ora({ color: "", stream: process.stdout });
    this.paths = {
      cwd: path.resolve("."),
      appModules: path.resolve("modules"),
      appModulesDefault: path.resolve("modules", "default"),
      appBuild: path.resolve("build"),
      appConfigJs: (options.config && path.resolve(options.config)) || process.env.MM_CONFIG_FILE || path.resolve("config", "config.js"),
      appIndexHtml: path.resolve("index.html"),
      appPackageJson: path.resolve("package.json")
    };
    this.config = loadConfig(this.paths.appConfigJs)
  }

  run() {
    process.on("exit", () => this.spinner.stopAndPersist());

    // run the command
    const command = this.options._[0];
    if (commands.map(c => c.command).includes(command)) {
      const onError = err => {
        this.spinner.fail(this.formatError(err));
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
      yargs.showHelp(help => console.log(help));
      return;
    }
  }

  formatBundlerEvents(bundler) {
    bundler.on("buildStart", () => {
      this.spinner.start("Building...");
    });
    bundler.on("bundled", () => {
      this.spinner.succeed(`MagicMirror built ${chalk.bold.green("successfully")}!`);
    });
    bundler.on("buildError", (err) => {
      this.spinner.fail(this.formatError(err));
    });
  }

  formatError(err) {
    let { name = "", fileName = "", loc, codeFrame = "", highlightedCodeFrame = "", message = "", stack = "" } = err;
    if (this.paths.cwd) {
      // omit device-specific portion of paths
      const basename = path.basename(this.paths.cwd);
      fileName = fileName && fileName.replace(this.paths.cwd, basename);
      stack = stack && stack.replace(this.paths.cwd, basename).split("\n").slice(1, 10).map(line => line.match(/node_modules|\(internal\//) ? chalk.gray(line) : line).join("\n");
      message = message && message.replace(this.paths.cwd, basename);
    }
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

  preflightCheck(paths = [this.paths.appIndexHtml, this.paths.appConfigJs, this.paths.appModules]) {
    paths.forEach(p => {
      if (!fs.existsSync(p)) {
        throw new Error(`Couldn't find ${p}; maybe you need to run 'mm init'?`)
      }
    });
  }
}

module.exports = CLI;

// parse command line arguments if this script was run directly,
// and exit the process if an error is thrown
if (require.main === module) {
  let instance;
  try {
    instance = new CLI(...process.argv.slice(2));
    const result = instance.run();
    if (result.catch) {
      result.catch(() => process.exit(1));
    }
  } catch (err) {
    process.exit(1);
  }
}
