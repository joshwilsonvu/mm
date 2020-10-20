"use strict";

const { pascalCase } = require("pascal-case");
const execa = require("execa");
const path = require("path");
const fs = require("fs-extra");
const prompts = require("prompts");

module.exports = async function () {
  let cancelled = false;
  const user = process.env.USER;
  let { moduleName, author, ghUsername, useTypeScript } = await prompts(
    [
      {
        type: "text",
        name: "moduleName",
        message: "Module name?",
        initial: "NewModule",
        validate: (n) =>
          moduleRegex.test(n)
            ? true
            : "please use only letters, numbers, underscores, and dashes",
      },
      {
        type: "text",
        name: "author",
        message: "Your name?",
        initial: user || "",
      },
      {
        type: "text",
        name: "ghUsername",
        message: "Your GitHub username?",
        initial: "N/A",
      },
      {
        type: "toggle",
        name: "useTypeScript",
        message: "Use JavaScript or TypeScript?",
        initial: false,
        inactive: "JavaScript",
        active: "TypeScript",
      },
    ],
    {
      onCancel: () => {
        cancelled = true;
      },
    }
  );
  if (cancelled) {
    console.info("Cancelled.");
    return;
  }

  moduleName = ensureMMM(moduleName);
  ghUsername = !ghUsername || ghUsername === "N/A" ? null : ghUsername;

  // support a module name like my-module, but write it in code as MyModule
  const componentName = pascalCase(moduleName.substr(4));

  if (!moduleRegex.test(moduleName) || !componentRegex.test(componentName)) {
    console.error(`Invalid module name "${moduleName}": .`);
    return 1;
  } else {
    console.debug("Module name is valid");
  }

  const paths = this.context.paths();

  const modulePath = path.join(paths.modules, moduleName);
  await fs.ensureDir(modulePath);
  if ((await fs.readdir(modulePath)).filter((p) => p !== ".git").length !== 0) {
    console.error(
      `Directory ${modulePath} is not empty; please empty or remove it and try again.`
    );
    return 1;
  } else {
    console.debug("Module path is free");
  }

  let hasGit = true;
  try {
    await gitInit({ modulePath, moduleName, ghUsername });
  } catch (_) {
    hasGit = false;
  }
  await Promise.all([
    writeIndexFile({ modulePath, componentName, useTypeScript }),
    writeNodeHelper({ modulePath, componentName, useTypeScript }),
    writePackageJson({ modulePath, moduleName, author, ghUsername }),
    writeReadme({ modulePath, moduleName, ghUsername }),
    writeLicense({ modulePath, author }),
  ]);
  console.log();
  await execa("yarn", [], { cwd: process.cwd(), stdio: "inherit" });
  if (hasGit) {
    await initialCommit({ modulePath, moduleName });
  }

  printInstructions({ modulePath, moduleName, useTypeScript, paths });
};

function ensureMMM(s) {
  return s.startsWith("MMM-") ? s : "MMM-" + s;
}

const moduleRegex = /^[a-zA-Z][_a-zA-Z0-9-]*$/;
const componentRegex = /^[A-Z][_a-zA-Z0-9]*$/;

async function gitInit({ modulePath, moduleName, ghUsername }) {
  console.debug("Running git init");
  await execa("git", ["init"], { cwd: modulePath });
  if (ghUsername) {
    await execa("git", [
      "remote",
      "add",
      "origin",
      `https://github.com/${ghUsername}/${moduleName}`,
    ]);
  }
}

async function writeIndexFile({ modulePath, componentName, useTypeScript }) {
  console.debug("Writing index");
  await fs.writeFile(
    path.join(modulePath, "index" + ext(useTypeScript)),
    `import React, { useState } from "react";
import {
  useNotification,
  sendNotification,
  useSocketNotification,
  sendSocketNotification,
  useFetchJson,
} from "magicmirror";
${useTypeScript ? 'import { ComponentProps } from "magicmirror"' : ""}

// This object contains default values for the module configuration.
const defaults = {
  // option: "default value"
};

export default function ${componentName}(props${
      useTypeScript ? ": ComponentProps" : ""
    })${useTypeScript ? ": React.ReactElement" : ""} {
  // Get the module configuration by combining defaults with props.config.
  const config = { ...defaults, ...props.config };

  // Props has other useful properties from the MagicMirror config file.
  const {
    name,
    identifier,
    position,
    classes,
    hidden,
    file,
    path,
    header,
  } = props;

  // Return HTML (React elements), using curly brackets to include JavaScript expressions.
  return (
    <div>
      Edit <pre>{file}</pre> in <pre>{path}</pre> to get started with your new
      module.
    </div>
  );
}

// See the docs for more information.
`
  );
}

async function writeNodeHelper({ modulePath, componentName, useTypeScript }) {
  console.debug("Writing node helper");
  await fs.writeFile(
    path.join(modulePath, "node_helper" + ext(useTypeScript) + ".sample"),
    `import NodeHelper from "magicmirror/node-helper";

export default class ${componentName}Helper extends NodeHelper {
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

  myHandler = (payload${useTypeScript ? ": any" : ""}) => {
    // do something with socket notification payload
  }
}`
  );
}

async function writePackageJson({
  modulePath,
  moduleName,
  author,
  ghUsername,
}) {
  let packageJson = {
    name: moduleName.toLowerCase(),
    version: "1.0.0",
    author: author,
    license: "MIT",
    private: true,
    dependencies: {
      magicmirror: `*`,
      react: ">=16.8",
    },
  };
  if (ghUsername) {
    packageJson.homepage = `https://github.com/${ghUsername}/${moduleName}`;
    packageJson.repository = {
      type: "git",
      url: `git+https://github.com/${ghUsername}/${moduleName}.git`,
    };
    packageJson.bugs = {
      url: `https://github.com/${ghUsername}/${moduleName}/issues`,
    };
  }
  await fs.writeJson(path.join(modulePath, "package.json"), packageJson, {
    spaces: 2,
  });
}

async function writeReadme({ modulePath, moduleName, ghUsername }) {
  console.debug("Writing README.md");
  if (!ghUsername) {
    ghUsername = "YOUR_USERNAME_HERE";
  }
  await fs.writeFile(
    path.join(modulePath, "README.md"),
    `# ${moduleName}

**Write a short, clear description of what this module does here.**

![A screenshot of the module. Save a screenshot to your repo as screenshot.jpg.](./screenshot.jpg)

Why did you make this module? What your module is all about? Write one or
two paragraphs here.

## Installation

> Note: This module requires [MagicMirror React](https://github.com/joshwilsonvu/MagicMirror) to run.

From your MagicMirror folder, run

\`\`\`sh
yarn mm add ${ghUsername}/${moduleName}
\`\`\`

or

\`\`\`sh
cd modules
git clone https://github.com/${ghUsername}/${moduleName}
cd ..
yarn
\`\`\`

## Usage

To use this module, add it to the \`modules\` array in the
\`config/config.js\` file.

\`\`\`javascript
modules: [
	{
		module: "${moduleName}",
		position: "top_left",	// any region
		config: {
			// See 'Configuration options' for details.
		}
	}
]
\`\`\`

## Configuration Options

    Option    |    Description
 :----------: | :---------------
\`option1\`   | Some information about what this option does. Default: "default".
`
  );
}

/* Writes the MIT license to modulePath/LICENSE. */
async function writeLicense({ modulePath, author }) {
  console.debug("Writing LICENSE");
  const year = new Date().getFullYear();
  await fs.writeFile(
    path.join(modulePath, "LICENSE"),
    `Copyright ${year} ${author}

Permission is hereby granted, free of charge, to any person \
obtaining a copy of this software and associated documentation \
files (the "Software"), to deal in the Software without restriction, \
including without limitation the rights to use, copy, modify, merge, \
publish, distribute, sublicense, and/or sell copies of the Software, \
and to permit persons to whom the Software is furnished to do so, \
subject to the following conditions:

The above copyright notice and this permission notice shall be \
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, \
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES \
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. \
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY \
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, \
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE \
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
`
  );
}

async function initialCommit({ modulePath, moduleName }) {
  console.debug("Doing initial commit");
  // tell git to ignore irrelevant files
  await fs.writeFile(
    path.join(modulePath, ".gitignore"),
    [
      "logs",
      "*.log",
      "node_modules",
      ".npm",
      ".yarn",
      ".pnp.*",
      ".DS_Store",
    ].join("\n")
  );
  // add all files to git
  await execa("git", ["add", "-A"], { cwd: modulePath });
  await execa("git", ["commit", "-m", `Initialized ${moduleName}.`], {
    cwd: modulePath,
  });
}

function printInstructions({ modulePath, moduleName, useTypeScript, paths }) {
  const chalk = require("chalk");
  const index = path.join(modulePath, "index" + ext(useTypeScript));

  console.log();
  console.success(
    chalk.bold(`Your new module ${moduleName} is ready to go!\n`)
  );
  console.info(
    `Your main module file is at ${chalk.underline(
      index
    )}.\nOpen it up with an editor such as Visual Studio Code or nano.\n`
  );
  console.info(
    `You'll need to add your new module to the ${chalk.bold(
      "config file"
    )} at ${chalk.underline(paths.config)}.\n`
  );
  console.info(
    `When you're ready to share your module, fill out your ${chalk.bold(
      "README.md file"
    )} at ${chalk.underline(path.join(modulePath, "README.md"))}.\n`
  );
  console.info(
    `Detailed documentation is located at ${chalk.underline(
      path.join(paths.cwd, "docs", "module-development.md")
    )}.\n`
  );
  console.log("Happy hacking!");
}

function ext(useTypeScript) {
  return useTypeScript ? ".tsx" : ".js";
}
