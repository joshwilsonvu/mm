const execa = require("execa");
const stripAnsi = require("strip-ansi");

test("shows help message on '$ mm'", async (...args) => {
  let { stderr } = await execaSafe("yarn", ["mm"]);
  expect(stderr).toMatchInlineSnapshot(`
    "mm [command]

    Commands:
      mm build  Create an optimized build
      mm dev    Start serving MagicMirror in development mode
      mm serve  Run MagicMirror from a build, creating one if necessary

    Options:
      --help     Show help                                                 [boolean]
      --version  Show version number                                       [boolean]

    Run mm <command> --help for more informaton about each command."
  `);
});

function stripYarn(output) {
  let lines = output.split("\n");

  let runIndex = lines.findIndex(line => line.match(/^yarn run/));
  if (runIndex !== -1) {
    lines.splice(0, runIndex + 2);
    lines = lines.filter(line => !line.match(/^info Visit.*yarnpkg/));
  }

  return lines.join("\n");
}

function execaSafe(...args) {
  return execa(...args)
    .then(({ stdout, stderr, ...rest }) => ({
      fulfilled: true,
      rejected: false,
      stdout: stripYarn(stripAnsi(stdout)),
      stderr: stripYarn(stripAnsi(stderr)),
      ...rest
    }))
    .catch(err => ({
      fulfilled: false,
      rejected: true,
      reason: err,
      stdout: "",
      stderr: stripYarn(
        stripAnsi(
          err.stderr // err.message
            .split("\n")
            .slice(5)
            .join("\n")
        )
      )
    }));
}
