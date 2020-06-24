/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const chalk = require("chalk");
const stripAnsi = require("strip-ansi");
const table = require("text-table");

exports.eslint = function formatter(results) {
  // All files and associated lines
  let blocks = results
    .map(({ filePath, messages, errorCount, warningCount }) => {
      if (errorCount + warningCount === 0) {
        return null;
      }
      // Discard warnings if there are errors
      const hasErrors = errorCount > 0;
      if (hasErrors) {
        messages = messages.filter(({ severity }) => severity === 2);
      }
      // Format warnings or errors for each file
      const color = hasErrors ? "red" : "yellow";
      const lines = messages.map((m) => formatLine(m, color));

      return {
        filePath,
        lines,
        hasErrors,
      };
    })
    .filter(Boolean);

  const hasErrors = blocks.some((block) => block.hasErrors);
  if (hasErrors) {
    // Discard files with only warnings if any have errors
    blocks = blocks.filter((block) => block.hasErrors);
  }

  // Convert blocks to a single output string
  const output = joinBlocks(blocks);
  let footer;
  if (hasErrors) {
    footer = `\n\nSearch for the ${chalk.underline(
      chalk.red("keywords")
    )} to learn more about each error.`;
  } else if (output.length) {
    footer = `\n\nSearch for the ${chalk.underline(
      chalk.yellow("keywords")
    )} to learn more about each warning.`;
  } else {
    footer = `No problems found!`;
  }
  return output + footer;
};

exports.ts = function tsFormatter(error) {
  const { code, severity, content, line, character } = error;

  return formatLine(
    {
      ruleId: `TS${code}`,
      message: content,
      line,
      column: character,
    },
    severity === "error" ? "red" : "yellow"
  ).join(" ");
};

function formatLine({ ruleId, message, line = 1, column = 1 }, color) {
  let position = `Line ${line}:${column}:`;
  message = message.replace(/\.$/, ""); // remove period
  ruleId = chalk[color](chalk.underline(ruleId));
  return [" ", position, message, ruleId].filter(Boolean);
}

function joinBlocks(blocks) {
  const cwd = process.cwd();
  return blocks
    .map(({ filePath, lines }) => {
      return [
        chalk.bold(filePath.replace(cwd, ".")),
        table(lines, {
          stringLength(str) {
            return stripAnsi(str).length;
          },
        }),
      ].join("\n");
    })
    .join("\n\n");
}
