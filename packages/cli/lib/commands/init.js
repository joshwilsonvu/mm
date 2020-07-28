"use strict";

const { Command } = require("clipanion");

const details = `\`mm init <new-module>\` will set up a folder and starter files for a new module.

Open up MagicMirror/modules/new-module/index.js to get started.
`;

class InitCommand extends Command {
  static usage = Command.Usage({
    description: "Set up files for a new module.",
    details: details,
    examples: [
      ["create a module called `my-module`", "yarn mm init my-module"],
      [
        "use TypeScript instead of JavaScript",
        "yarn mm init --typescript my-module",
      ],
    ],
  });

  useTypeScript = false;
  name = "";

  async execute() {
    const path = require("path");
    const fs = require("fs-extra");
    const paths = this.context.paths();

    if (!/^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/.test(this.name)) {
      console.error(
        `Invalid module name ${this.name}; please choose a JavaScript identifier.`
      );
      return 1;
    }

    const modulePath = path.join(paths.appModules, this.name);
    await fs.ensureDir(modulePath);
    if (
      (await fs.readdir(modulePath)).filter((p) => p !== ".git").length !== 0
    ) {
      console.error(
        `Directory ${modulePath} is not empty; please empty or remove it and try again.`
      );
      return 1;
    }

    const addIndexFile = () =>
      fs.write(
        path.join(modulePath, "index" + this.useTypeScript ? ".tsx" : ".js"),
        indexFile(this.name, this.useTypeScript)
      );
    const addNodeHelper = () =>
      fs.write(
        path.join(
          modulePath,
          "node_helper" + this.useTypeScript ? ".ts" : ".js"
        ),
        nodeHelper(this.name, this.useTypeScript)
      );
    const addPackageJson = () =>
      fs.writeJson(
        path.join(modulePath, "package.json"),
        {
          name: this.name,
          private: true,
          dependencies: {
            "@mm/core": `*`,
            "@mm/node-helper": `*`,
            react: "*",
          },
        },
        { spaces: 2 }
      );

    await Promise.all([addIndexFile(), addNodeHelper(), addPackageJson()]);
  }
}

InitCommand.addPath("init");
InitCommand.addOption("name", Command.String({ required: true }));
InitCommand.addOption("useTypeScript", Command.Boolean("--typescript"));

module.exports = InitCommand;

const indexFile = (moduleName, useTypeScript) => `
import React, { useState } from "react";
import { useNotification, sendNotification, useSocketNotification, sendSocketNotification, } from "@mm/core";
${useTypeScript ? 'import type { ComponentProps } from "@mm/core"' : ""}

// This object contains default values for the module configuration.
const defaults = {};

export default function ${moduleName}(props${
  useTypeScript ? ": ComponentProps" : ""
}) {
  // get the module configuration by combining defaults with props.config
  const config = { ...defaults, ...props.config };

  // props has other useful properties from the config file
  const { name, identifier, position, classes, hidden, file, path, header } = props;

  // Use state to keep track of data that can change, and set the state from other React hooks. This
  // makes sure that the view will automatically update.
  const [counter, setCounter] = useState(0);
  useNotification("INCREMENT", () => setCounter(counter + 1));

  // return HTML (React elements), using curly brackets to include JavaScript expressions
  return (
    <div>
      The current value of the counter is {counter}.
    </div>
  );
}

// See the docs for more information.
`;

const nodeHelper = (moduleName, useTypeScript) => `
import NodeHelper from "@mm/node-helper";

export default class ${moduleName}Helper extends NodeHelper {
  start() {
    this.on("MySocketNotification", this.myHandler);

    setTimeout(
      () => this.sendSocketNotification("MyReturnNotification", { data: "data" }),
      5000
    );
  }

  stop() {
    this.off("MySocketNotification", this.myHandler);
  }

  myHandler(payload${useTypeScript ? ": any" : ""}) {
    // do something with socket notification payload
  }
}`;
