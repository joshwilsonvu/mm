const execa = require("execa");
const cliPath = require.resolve("..");

test("shows help message on '$ mm'", async () => {
  // Run the CLI programmatically. Equivalent to '$ yarn mm'
  const result = await execa(cliPath, [], { all: true });
  expect(result.all)
    .toMatchInlineSnapshot(`
    "mm [command]

    Commands:
      mm build  Create an optimized build
      mm dev    Start serving MagicMirror in development mode
      mm serve  Run MagicMirror from a build

    Options:
      --cwd      run mm in this directory
      --help     Show help                                                 [boolean]
      --version  Show version number                                       [boolean]

    Run mm <command> --help for more informaton about each command."
  `);
});
