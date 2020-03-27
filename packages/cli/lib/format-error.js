const path = require("path");
const paths = require("./paths");
const chalk = require("chalk");

module.exports = function formatError(err) {
  let { name, fileName, loc, codeFrame, highlightedCodeFrame, message, stack } = err;
  if (paths.cwd) {
    // omit device-specific portion of paths
    const basename = path.basename(paths.cwd);
    fileName = fileName && fileName.replace(paths.cwd, basename);
    stack = stack && stack.replace(paths.cwd, basename).split("\n").map(line => line.match(/node_modules/) ? chalk.dim(line) : line).join("\n");
    message = message.replace(paths.cwd, basename);
  }
  message = message.replace(/error: /i, "");

  let parts = [];
  if (fileName && loc) {
    parts.push(chalk.bold.red(`${name || "Error"} at ${fileName}:${loc.line}:${loc.column}: `));
  } else {
    parts.push(chalk.bold.red(`${name || "Error"}: `));
  }
  parts.push(chalk.bold.red(`${message}\n\n`));

  if (highlightedCodeFrame && chalk.supportsColor) {
    parts.push(highlightedCodeFrame);
  } else if (codeFrame) {
    parts.push(codeFrame);
  } else {
    parts.push(stack.split("\n").slice(1, 6).join("\n"));
  }
  return parts.join("");
}