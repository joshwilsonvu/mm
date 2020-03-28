const execa = require("execa");
const stripAnsi = require("strip-ansi");

const mmCli = require("..");

let restore;

test("shows help message on '$ mm'", async () => {
  restore = mockStdout();
  // Run the CLI programmatically. Equivalent to '$ yarn mm'
  await mmCli();

  // TODO replace console.log with mock from {
  // const { Console } = require("console");
  // const stream = get stream somehow
  // jest.mock(global, "console", new Console(stream));
  // ...
  // now we have all console output
  expect(process.stdout.content()).toMatchInlineSnapshot(`
    "   mm [command]
        
        Commands:
          mm build  Create an optimized build
          mm dev    Start serving MagicMirror in development mode
          mm serve  Run MagicMirror from a build
        
        Options:
          --cwd      run mm in this directory
          --help     Show help                                                 [boolean]
          --version  Show version number                                       [boolean]
        
        Run mm <command> --help for more informaton about each command.

    "
  `);
});

afterAll(() => restore && restore());

/*
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
*/


