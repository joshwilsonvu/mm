#!/usr/bin/env node

const yargs = require("yargs");

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});



const commands = [
  {
    command: "dev",
    describe: "start in development mode",
    serveronly: {
      describe: "don't open an electron app window"
    }
  },
  {
    command: "build",
    describe: "create an optimized build"
  },
  {
    command: "serve",
    describe: "run MagicMirror from a build",
    serveronly: {
      describe: "don't open an electron app window",
      conflicts: "clientonly",
    },
    clientonly: {
      describe: "only open an electron app window, and use another server with --address and --port",
      conflicts: "serveronly",
    },
    "no-build": {
      describe: "if MagicMirror hasn't been built, abort instead of running a build before serving",
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
  }
];

const argv = commands
  .reduce((yargs, command) => yargs.command(command), yargs) // returns yargs for chaining
  .strictCommands()
  .help()
  .version(require("../package.json").version)
  .epilogue("Run $0 <command> --help for more informaton about each command.")
  .argv;

console.log(argv);

if (argv._.length && commands.map(c => c.command).includes(argv._[0])) {
  argv.command = argv._[0];
  require("../lib")(argv);
} else {
  yargs.showHelp();
  process.exit()
}

