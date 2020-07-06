"use strict";

const { Command } = require("clipanion");

const details = `
\`mm serve\` will serve files previously built with \`mm build\` \
and run Node helpers as needed based on the config. If necessary, \`mm build\`
will be run automatically.

Unlike \`mm start\`, \`mm serve\` doesn't automatically update on file changes.

\`mm view\` can connect to \`mm serve\` on another device.

(Compare \`mm serve\` to \`npm run serveronly\` in MM2.)`;

class ServeCommand extends Command {
  static usage = Command.Usage({
    description: "Serve prebuilt files and run Node helpers.",
    details: details,
    examples: [
      ["serve for another device", "yarn mm serve"],
      ["always run `mm build` before serving", "yarn mm serve --rebuild"],
      ["serve and view in Electron on the same device", "yarn mm serve --view"],
      [
        "serve and view in a browser on the same device",
        "yarn mm serve --browser",
      ],
    ],
  });

  // options
  rebuild = false;
  view = false;
  browser = false;

  async execute() {
    // Force production mode
    process.env.NODE_ENV = "production";

    const createServer = require("../shared/create-server");
    const fs = require("fs");
    const openBrowser = require("react-dev-utils/openBrowser");
    const keypress = require("../shared/keypress");

    const paths = this.context.paths();
    const config = this.context.config();
    const url = `http${config.useHttps ? "s" : ""}://${config.address}:${
      config.port
    }`;

    if (
      !fs.existsSync(paths.appBuild) ||
      fs.readdirSync(paths.appBuild).length === 0
    ) {
      console.info(`No files found in ${paths.appBuild}. Building...`);
      await this.cli.run(["build"]);
    } else if (this.rebuild) {
      console.info(`Rebuilding files to ${paths.appBuild} ...`);
      await this.cli.run(["build"]);
    }

    let server = await createServer(config, paths);
    server.listen();
    console.success("Listening on", url);
    console.info("Press 'q' to quit.");

    const kp = keypress();
    kp.on("q", () => process.kill(process.pid, "SIGINT"));

    if (this.browser) {
      openBrowser(config.url);
    } else if (this.view) {
      const window = Window(config, { dev: true });
      await window.open();
    }
    return new Promise((resolve) => {
      process.once("SIGINT", () => {
        setTimeout(() => process.exit(0), 1000).unref();
        kp.done();
        resolve && resolve();
      });
    });
  }
}

ServeCommand.addPath("serve");
ServeCommand.addOption("rebuild", Command.Boolean("--rebuild"));
ServeCommand.addOption("view", Command.Boolean("--view"));
ServeCommand.addOption("browser", Command.Boolean("--browser"));

module.exports = ServeCommand;
