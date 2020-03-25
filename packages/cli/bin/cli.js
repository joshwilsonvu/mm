#!/usr/bin/env node

const yargs = require("yargs");
const path = require("path");

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

const argv = yargs
  .scriptName("mm")
  .commandDir(path.join("..", "lib", "commands"))
  .help()
  .showHelpOnFail()
  .version(require("../package.json").version)
  .epilogue("Run $0 <command> --help for more informaton about each command.")
  .argv;

if (!argv._.length) {
  yargs.showHelp();
}