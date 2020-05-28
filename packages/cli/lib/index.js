#!/usr/bin/env node

const yargs = require("yargs");
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const logSymbols = require("log-symbols");
const resolve = require("resolve");
const loadConfig = require("./shared/load-config");


if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const commands = [
  {
    command: "start",
    describe: "Start serving MagicMirror in development mode",
    builder: y => y.options({
      browser: {
        describe: "open a web browser instead of an electron window"
      }
    })
  },
  {
    command: "build",
    describe: "Create an optimized build",
    builder: y => y.options({
      analyze: {
        describe: "after the build, show the contents of the bundle"
      }
    })
  },
  {
    command: "serve",
    describe: "Run MagicMirror from a build",
    builder: y => y.options({
      build: {
        describe: "if MagicMirror hasn't been built, run a build before serving",
      },
      browser: {
        describe: "open a web browser"
      },
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
    // handle cwd option
    if (fs.existsSync(options.cwd)) {
      process.chdir(options.cwd);
    }
    this.options = options;

    const cwd = process.cwd(), extensions = ['.mjs', '.js', '.ts', '.tsx', '.json', '.jsx'];
    const resolveExtensions = path => resolve.sync(path, {
      extensions: extensions,
      basedir: cwd,
    });
    this.paths = {
      cwd: cwd,
      appModules: path.resolve("modules"),
      appModulesDefault: path.resolve("modules", "default"),
      appBuild: path.resolve("build"),
      appConfig: resolveExtensions("./" + path.posix.relative(cwd, (options.config || process.env.MM_CONFIG_FILE || "config/config").replace("\\", "/"))),
      appIndex: resolveExtensions("./src/index"),
      appIndexHtml: path.resolve("index.html"),
      appPackageJson: path.resolve("package.json"),
      appTsConfig: path.resolve("tsconfig.json"),
      appNodeModules: path.resolve("node_modules"), // be careful to only use this in Webpack options, so Yarn PnP works
      extensions: extensions,
      resolve: resolveExtensions,
    };
    console.log(this.paths);
    // transpile server-side user files, including MagicMirror config
    const { register } = require("./shared/babel-config");
    register(this.paths);
    this.config = loadConfig(this.paths.appConfig);

    const pe = new (require("pretty-error"))();
    pe.appendStyle({
      // this is a selector to the element that says 'Error'
      'pretty-error > header > title > kind': {
        display: 'none'
      },
      // the 'colon' after 'Error':
      'pretty-error > header > colon': {
        display: 'none'
      },
    });
    pe.alias(this.paths.cwd, path.basename(this.paths.cwd));
    const skip = /internal[/\\]|\.pnp\.js/;
    pe.skip((traceLine) => {
      return traceLine.path && skip.test(traceLine.path);
    });
    this.formatError = pe.render.bind(pe);
  }

  run() {
    // run the command
    const command = this.options && this.options._[0];
    if (command && commands.map(c => c.command).includes(command)) {
      // given a valid command, require the matching file in this directory and call the exported function as a method
      const method = require(`./${command}`);
      return method.apply(this);
    } else {
      yargs.showHelp(console.log);
      return;
    }
  }

//   formatError(err) {
//     return pe.render(err);
//     let { name = "", fileName = "", loc, codeFrame = "", highlightedCodeFrame = "", message = "", stack = "" } = err;
//     if (this.paths.cwd) {
//       // omit device-specific portion of paths
//       const basename = path.basename(this.paths.cwd);
//       fileName = fileName && fileName.replace(this.paths.cwd, basename);
//       stack = stack && stack.replace(this.paths.cwd, basename).replace(message, "");
//       message = message && message.replace(this.paths.cwd, basename);
//     }
//     stack = stack && stack.split("\n").slice(1, 10).map(line => line.match(/node_modules|\(internal[/\\]|\.yarn[/\\]/) ? chalk.gray(line) : line).join("\n");
//     message = message && message.replace(/error: /i, "");

//     let parts = [];
//     if (fileName && loc) {
//       parts.push(chalk.bold.red(`${name || "Error"} at ${fileName}:${loc.line}:${loc.column}: `));
//     } else {
//       parts.push(chalk.bold.red(`${name || "Error"}: `));
//     }
//     parts.push(chalk.bold.red(`${message}\n\n`));

//     if (highlightedCodeFrame && chalk.supportsColor) {
//       parts.push(highlightedCodeFrame);
//     } else if (codeFrame) {
//       parts.push(codeFrame);
//     } else if (stack) {
//       parts.push(stack);
//     }
//     parts.push(`\n`)
//     return parts.join("");
//   }
}

(async function main() {
  let instance = new CLI(...process.argv.slice(2));
  try {
    await instance.run();
  } catch (err) {
    console.log(instance.formatError(err));
  }
})();
