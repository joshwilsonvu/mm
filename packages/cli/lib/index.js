#!/usr/bin/env node

const yargs = require("yargs");
const fs = require("fs-extra");

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

const parse = yargs
  .scriptName("mm")
  .command("build", "Create an optimized build")
  .command("dev", "Start serving MagicMirror in development mode", {
    serveronly: {
      describe: "don't open an electron app window"
    }
  })
  .command("serve", "Run MagicMirror from a build", {
    serveronly: {
      describe: "don't open an electron app window, only serve for a web browser",
      conflicts: "clientonly",
    },
    clientonly: {
      describe: "only open an electron app window, and use another server with --address and --port",
      conflicts: "serveronly",
    },
    "build": {
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
  .option("cwd", "run mm in this directory")
  .help()
  .showHelpOnFail()
  .version(require("../package.json").version)
  .epilogue("Run $0 <command> --help for more informaton about each command.")
  .parse;

async function cli(...argv) {
  const opts = parse(argv);
  if (!opts._.length) {
    yargs.showHelp();
  }

  // handle cwd option, only if run as standalone
  if (opts.cwd && require.main === module && fs.existsSync(opts.cwd)) {
    process.chdir(opts.cwd);
  }

  // run the command
  const command = opts._[0];
  const commandModule = (() => {
    switch (command) {
      case "build":
        return require("./build");
      case "dev":
        return require("./dev");
      case "serve":
        return require("./serve");
      default:
        yargs.showHelp();
    };
  })();
  if (commandModule) {
    try {
      return await commandModule(opts);
    } catch (err) {
      const formatError = require("./format-error");
      console.log(formatError(err));
      return 1;
    }
  }
}
module.exports = cli;

// parse command line arguments if this script was run directly
if (require.main === module) {
  cli(process.argv);
}