const yargs = require("yargs");

const argv = yargs
  .command("dev", "start in development mode", {
    "serveronly": {
      describe: "don't open an electron app window"
    }
  }, argv => Scripts(argv).dev())
  .command("build", "create an optimized build", {}, argv => Scripts(argv).build())
  .command("serve", "run MagicMirror from a build", {
    "serveronly": {
      describe: "don't open an electron app window",
      conflicts: "clientonly",
    },
    "clientonly": {
      describe: "only open an electron app window, and use another server with --address and --port",
      conflicts: "serveronly",
    },
    "no-build": {
      describe: "if MagicMirror hasn't been built, abort instead of running a build before serving",
    },
    "address": {
      type: "string",
      describe: "the IP address of the server to connect to",
      implies: "clientonly",
    },
    "port": {
      type: "number",
      describe: "the port of the server to connect to",
      implies: "clientonly",
    }
  }, argv => Scripts(argv).serve())
  .demandCommand(1, '')
  .showHelpOnFail(true)
  .help()
  .version(require("../package.json").version)
  .epilogue("Run $0 <command> --help for more informaton about each command.")
  .argv;

function Scripts(argv) {
  return new (require('./scripts'))(argv);
}