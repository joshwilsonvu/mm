const execa = require("execa");
const path = require("path");

test("shows help message on '$ mm --help'", async () => {
  const { exitCode, stdout, stderr } = await execa.node(
    path.resolve(__dirname, "..", "bin", "cli.js"),
    ["--help"]
  );

  expect(exitCode).toBe(0);
  expect(stdout).toMatchInlineSnapshot(`
    "cli.js <command>

    Commands:
      cli.js dev    start in development mode
      cli.js build  create an optimized build
      cli.js serve  run MagicMirror from a build

    Options:
      --help     Show help                                                 [boolean]
      --version  Show version number                                       [boolean]

    Run cli.js <command> --help for more informaton about each command."
  `);
  expect(stderr).toMatchInlineSnapshot(`""`);
});
