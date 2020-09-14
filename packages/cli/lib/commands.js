const { Command } = require("clipanion");

const startDetails = `\`mm start\` compiles your files on the fly and updates \
the app instantly as you update your code or config.

Use it to quickly configure your mirror or develop your module before optimizing performance \
with \`mm build\`.`;

class StartCommand extends Command {
  static usage = Command.Usage({
    description:
      "Start the app and instantly see changes to your source files.",
    details: startDetails,
    examples: [
      ["Start with live updates", "yarn mm start"],
      ["Start in a browser instead of Electron", "yarn mm start --browser"],
      [
        "Start to be viewed on another device with `mm view`",
        "yarn mm start --no-view",
      ],
      [
        "Start without linting or type checking (faster, but can miss bugs)",
        "yarn mm start --fast",
      ],
    ],
  });

  // options
  noView = false;
  browser = false;
  fast = false;

  execute() {
    return require("./commands/start").call(this);
  }
}

StartCommand.addPath("start");
StartCommand.addOption("noView", Command.Boolean("--no-view"));
StartCommand.addOption("browser", Command.Boolean("-b,--browser"));
StartCommand.addOption("fast", Command.Boolean("--fast"));

exports.Start = StartCommand;

/***************************/

const buildDetails = `\`mm build\` will compile all of your code, stylesheets, etc. into static \
files that browsers can understand. The files will be placed into the ./build folder.

Running \`mm serve\` will serve these static files and run Node helpers as needed based \
on the config.

\`mm build\` can take a long time, but it performs optimizations that make the application \
load and run faster.`;

class BuildCommand extends Command {
  static usage = Command.Usage({
    description:
      "Prepare all source files, stylesheets, and asset files to be served with `mm serve`.",
    details: buildDetails,
    examples: [
      ["build files for `mm serve`", "yarn mm build"],
      [
        "show information about the compiled files after building",
        "yarn mm build --analyze",
      ],
    ],
  });

  analyze = false;
  fast = false;

  execute() {
    return require("./commands/build").call(this);
  }
}

BuildCommand.addPath("build");
BuildCommand.addOption("analyze", Command.Boolean("--analyze"));
BuildCommand.addOption("fast", Command.Boolean("--fast"));

exports.Build = BuildCommand;

/***************************/

const serveDetails = `
\`mm serve\` will serve files previously built with \`mm build\` \
and run Node helpers as needed based on the config. If necessary, \`mm build\` \
will be run automatically.

Unlike \`mm start\`, \`mm serve\` doesn't automatically update on file changes.

\`mm view\` can connect to \`mm serve\` on another device.

(Compare \`mm serve\` to \`npm run serveronly\` in MM2.)`;

class ServeCommand extends Command {
  static usage = Command.Usage({
    description: "Serve prebuilt files and run Node helpers.",
    details: serveDetails,
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

  execute() {
    return require("./commands/serve").call(this);
  }
}

ServeCommand.addPath("serve");
ServeCommand.addOption("rebuild", Command.Boolean("--rebuild"));
ServeCommand.addOption("view", Command.Boolean("--view"));
ServeCommand.addOption("browser", Command.Boolean("-b,--browser"));

exports.Serve = ServeCommand;

/***************************/

const viewDetails = `\`mm view\` connects to another device running \`mm serve\` and displays the application.

It is similar to opening a browser to \`http://[address]:[port]\`, but uses Electron so that there is no need \
to install a browser on the current device.`;

class ViewCommand extends Command {
  static usage = Command.Usage({
    description: "Connect to `mm serve` and display the application.",
    details: viewDetails,
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

  execute() {
    require("./commands/view").call(this);
  }
}

ViewCommand.addPath("view");
ViewCommand.addOption("address", Command.String("--address,-a"));
ViewCommand.addOption("port", Command.String("--port,-p"));
ViewCommand.addOption("url", Command.String("--url,-u"));

exports.View = ViewCommand;

/***************************/

class CheckCommand extends Command {
  static usage = Command.Usage({
    description: "Check your files for problems.",
    details:
      "`mm check` checks your files for potential problems using ESLint and TypeScript.",
    examples: [
      ["Check your config and source files", "yarn mm check"],
      ["Watch files and update results", "yarn mm check --watch"],
    ],
  });

  watch = false;

  execute() {
    return require("./commands/check").call(this);
  }
}

CheckCommand.addPath("check");
CheckCommand.addOption("watch", Command.Boolean("-w,--watch"));

exports.Check = CheckCommand;

/***************************/

const newDetails = `\`mm new\` will set up a folder and starter files for a new module.

It will ask you a few questions, like the name of the module you want to make. \
You will be shown which files are created and how to get started.
`;

class NewCommand extends Command {
  static usage = Command.Usage({
    description: "Set up files for a new module.",
    details: newDetails,
  });

  execute() {
    return require("./commands/new").call(this);
  }
}

NewCommand.addPath("new");

exports.New = NewCommand;

/***************************/

const addDetails = `\`mm add <module>\` will add a third-party MagicMirror module to your project.

\`mm add\` will download and set up a module from GitHub. In most cases it can find the right module \
from the name alone.

In some cases you will need to specify the GitHub username of the module's author. Use \
the format \`mm add <github-username>/<module>\`.
`;

class AddCommand extends Command {
  static usage = Command.Usage({
    description: "Adds a MagicMirror module to your project.",
    details: addDetails,
    examples: [
      ["Add by module name", "yarn mm add MMM-WeatherDependentClothes"],
      [
        "Add by GitHub username and module name",
        "yarn mm add fruestueck/MMM-WeatherDependentClothes",
      ],
    ],
  });

  moduleName = "";

  execute() {
    return require("./commands/add").call(this);
  }
}

AddCommand.addPath("add");
AddCommand.addOption("moduleName", Command.String({ required: true }));

exports.Add = AddCommand;
