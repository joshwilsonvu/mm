const execa = require("execa");
const cliPath = require.resolve("..");

/*
 * The best way to test the CLI's functionality is to test the application as a whole,
 * since it is responsible for building, serving, and reloading MagicMirror. Therefore,
 * tests in e2e.test.js may uncover problems here that these tests don't find.
 */
async function testOutput(...args) {
  const result = await execa(cliPath, args);
  expect(result.stdout).toMatchSnapshot();
}
test("shows help message on '$ mm'", () => testOutput());

test("shows help message on '$ mm start -h'", () => testOutput("start", "--help"));

test("shows help message on '$ mm build -h'", () => testOutput("build", "--help"));

test("shows help message on '$ mm serve -h'", () => testOutput("serve", "--help"));