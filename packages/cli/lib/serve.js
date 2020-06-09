'use strict';

const { Command } = require("clipanion");

const details = `
\`mm serve\` will serve files previously built with \`mm build\` \
and run Node helpers as needed based on the config.

Unlike \`mm start\`, \`mm serve\` doesn't automatically update on file changes.

\`mm view\` can connect to \`mm serve\` on another device.

(Compare \`mm serve\` to \`npm run serveronly\` in MM2.)`;

class ServeCommand extends Command {
  static usage = Command.Usage({
    description: "Serve prebuilt files and run Node helpers.",
    details: details,
    examples: [
      ["serve from a build for another device", "yarn mm serve"],
      ["run `mm build` before serving if necessary", "yarn mm serve --build"],
      ["serve and view in Electron on the same device", "yarn mm serve --view"],
      ["serve and view in a browser on the same device", "yarn mm serve --browser"]
    ]
  })

  // options
  build = false;
  view = false;
  browser = false;

  async execute() {
    const createServer = require("./shared/create-server");
    const fs = require("fs");
    const openBrowser = require("react-dev-utils/openBrowser");

    const paths = this.context.paths();
    const config = this.context.config();

    if (this.build) {
      if (!fs.existsSync(paths.appBuild) || fs.readdirSync(paths.appBuild).length === 0) {
        console.info(`No files found at ${paths.appBuild}. Building...`);
        await this.cli.run(["build"]);
      }
    }

    let server = await createServer(config, paths);
    server.listen();
    console.success("Listening on", config.url);
    console.info("Press Ctrl+C to stop.");

    if (this.browser) {
      openBrowser(config.url);
    } else if (this.view) {
      const window = Window(config, { dev: true });
      await window.open();
    }
  }
}

ServeCommand.addPath("serve");
ServeCommand.addOption("build", Command.Boolean("--build"));
ServeCommand.addOption("view", Command.Boolean("--view"));
ServeCommand.addOption("browser", Command.Boolean("--browser"));

module.exports = ServeCommand;