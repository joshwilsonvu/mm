const execa = require("execa");
const stripAnsi = require("strip-ansi");
const cliPath = require.resolve("..");

/*
 * The best way to test the CLI's functionality is to test the application as a whole,
 * since it is responsible for building, serving, and reloading MagicMirror. Therefore,
 * tests in e2e.test.js may uncover problems here that these tests don't find.
 */
async function testOutput(...args) {
  const result = await execa(cliPath, args);
  expect(stripAnsi(result.stdout)).toMatchSnapshot();
}
test("shows help message on '$ mm'", () => testOutput());

test("shows help message on '$ mm start -h'", () =>
  testOutput("start", "--help"));

test("shows help message on '$ mm view -h'", () =>
  testOutput("view", "--help"));

test("shows help message on '$ mm add -h'", () => testOutput("add", "--help"));

test("shows help message on '$ mm new -h'", () => testOutput("new", "--help"));
