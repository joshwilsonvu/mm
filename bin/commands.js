const { Command } = require("clipanion");

const startDetails = `\`mm start\` compiles your files on the fly and updates \
the app instantly as you update your code or config.

Use it to quickly configure your mirror or develop your module.`;

class StartCommand extends Command {
  static usage = Command.Usage({
    description:
      "Start the app and instantly see changes to your source files.",
    details: startDetails,
    examples: [
      ["Start MagicMirror with live updates", "yarn mm start"],
      ["Start in a browser instead of Electron", "yarn mm start --browser"],
      [
        "Start to be viewed on another device with `mm view` instead of this device",
        "yarn mm start --for-view",
      ],
    ],
  });

  // options
  noView = false;
  browser = false;

  execute() {
    return require("./commands/start").call(this);
  }
}

StartCommand.addPath("start");
StartCommand.addOption("forView", Command.Boolean("--for-view"));
StartCommand.addOption("browser", Command.Boolean("-b,--browser"));

exports.Start = StartCommand;

/***************************/

const viewDetails = `\`mm view\` connects to another device running \`mm start\` and displays the application.

It is similar to opening a browser to \`http://[address]:[port]\`, but uses Electron so that there is no need \
to install a browser on the current device.`;

class ViewCommand extends Command {
  static usage = Command.Usage({
    description: "Connect to `mm start` and display the application.",
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
        "Connect to `mm start --for-view` on the current device",
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

// class CheckCommand extends Command {
//   static usage = Command.Usage({
//     description: "Check your files for problems.",
//     details:
//       "`mm check` checks your files for potential problems using ESLint and TypeScript.",
//     examples: [
//       ["Check your config and source files", "yarn mm check"],
//       ["Watch files and update results", "yarn mm check --watch"],
//     ],
//   });

//   watch = false;

//   execute() {
//     return require("./commands/check").call(this);
//   }
// }

// CheckCommand.addPath("check");
// CheckCommand.addOption("watch", Command.Boolean("-w,--watch"));

// exports.Check = CheckCommand;

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
