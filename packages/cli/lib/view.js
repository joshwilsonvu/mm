"use strict";

const { Command } = require("clipanion");

const details = `\`mm view\` connects to another device running \`mm serve\` and displays the application.

It is similar to opening a browser to \`http://[address]:[port]\`, but uses Electron so that there is no need \
to install a browser on the current device.`;

class ViewCommand extends Command {
  static usage = Command.Usage({
    description: "Connect to `mm serve` and display the application.",
    details: details,
    examples: [
      [
        "Connect to the address and port specified in the config file",
        "yarn mm view",
      ],
      [
        "Specify the address and port to connect to",
        "yarn mm view --address 192.168.0.5 --port 8080",
      ],
      [
        "Specify the url to connect to",
        "yarn mm view --url http://192.168.0.5:8080",
      ],
      [
        "Connect to `mm serve` on the current device",
        "yarn mm view --port 8080",
      ],
    ],
  });

  // options
  address = "";
  port = NaN;
  url = "";

  async execute() {
    const createWindow = require("./shared/create-window");

    const config = this.context.config();
    if (this.address) {
      config.address = this.address;
    }
    if (this.port) {
      config.port = this.port;
    }
    const url = this.url || config.url;
    console.info("Viewing", url);
    const window = createWindow(config);
    window.open();
    return new Promise((resolve) => {
      process.on("SIGINT", () => {
        resolve && resolve();
        setTimeout(() => process.exit(0), 1000).unref();
      });
    });
  }
}

ViewCommand.addPath("view");
ViewCommand.addOption("address", Command.String("--address,-a"));
ViewCommand.addOption("port", Command.String("--port,-p"));
ViewCommand.addOption("url", Command.String("--url,-u"));

module.exports = ViewCommand;
