#!/usr/bin/env node

require("dotenv").config(); // loads environment variables from .env file
const { Cli, Command } = require("clipanion");
const symbols = require("log-symbols");
const format = require("util").format;

// Add some decoration to console methods
console.info = (...args) => console.log(`${symbols.info} ${format(...args)}`);
console.success = (...args) =>
  console.log(`${symbols.success} ${format(...args)}`);
console.warn = (...args) =>
  console.log(`${symbols.warning} ${format(...args)}`);
console.error = (...args) => console.log(`${symbols.error} ${format(...args)}`);
if (process.env.MM_DEBUG && process.env.MM_DEBUG !== "false") {
  console.debug = (...args) => console.log(`[DEBUG] ${format(...args)}`);
  console.debug("Environment variable MM_DEBUG is set; showing debug logs.");
} else {
  console.debug = () => {};
}

// Default to development mode
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

const cli = new Cli({
  binaryLabel: "MagicMirror CLI",
  binaryName: "mm",
  binaryVersion: require("../package.json").version,
});

// Support the following commands
const commands = require("./commands");
for (const command of Object.values(commands)) {
  cli.register(command);
}
Command.Entries.Help.addPath(); // run help by default
cli.register(Command.Entries.Help);
cli.register(Command.Entries.Version);

cli.run(process.argv.slice(2), Cli.defaultContext).then((code) => {
  process.exitCode = code;
  setTimeout(() => process.exit(), 2000).unref();
});
