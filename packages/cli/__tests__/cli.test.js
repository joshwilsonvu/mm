const execa = require("execa");
const cliPath = require.resolve("..");

/*
 * The best way to test the CLI's functionality is to test the application as a whole,
 * since it is responsible for building, serving, and reloading MagicMirror. Therefore,
 * tests in e2e.test.js may uncover problems here that these tests don't find.
 */
test("shows help message on '$ mm'", async () => {
  const result = await execa(cliPath, [], { all: true });
  expect(result.all).toMatchInlineSnapshot(`
    "mm [command]

    Commands:
      mm start  Start serving MagicMirror in development mode
      mm build  Create an optimized build
      mm serve  Run MagicMirror from a build

    Options:
      --cwd      run mm in this directory                                   [string]
      --config   the path to the MagicMirror config file                    [string]
      --help     Show help                                                 [boolean]
      --version  Show version number                                       [boolean]

    Run mm <command> --help for more informaton about each command."
  `);
});
