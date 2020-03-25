const fs = require("fs-extra");

const path = require("path");
const axios = require("axios");
const { execa, execaSafe } = require("./execa");
const waitForLocalhost = require("wait-for-localhost");
const uniqueFilename = require("unique-filename");

let mm;
beforeAll(async () => {
  let stdout = (await execa("yarn", ["bin", "mm"])).stdout.trim(); // obtain path to mm binary
  expect(stdout).toMatch(/mm(\.js)?$/);
  console.log(stdout);
  expect(await fs.pathExists(stdout)).toBe(true);
  mm = stdout;
});

describe.each([
  [path.join(__dirname, "__fixtures__", "basic")]
])("fixture '%s'", (_fixtureDirectory) => {
  let testDirectory = '';
  const paths = {
    get entry() { return path.join(testDirectory, "index.html") },
    get build() { return path.join(testDirectory, "build") },
    get buildEntry() { return path.join(testDirectory, "build", "index.html") },
  }
  // Copy the fixture to a temporary directory and run tests there
  beforeEach(async () => {
    expect(testDirectory).toBeFalsy();
    expect(await fs.pathExists(_fixtureDirectory)).toBe(true);
    testDirectory = uniqueFilename(path.join(__dirname, "__fixtures__"), path.basename(_fixtureDirectory));
    await fs.copy(_fixtureDirectory, testDirectory);
    expect(await fs.pathExists(testDirectory)).toBe(true);
  });
  // Clean up the temporary test directory
  afterEach(async () => {
    expect(testDirectory).toBeTruthy();
    expect(await fs.pathExists(testDirectory)).toBe(true);
    await fs.remove(testDirectory);
    testDirectory = '';
  });

  test("builds in production mode", async () => {
    jest.setTimeout(5 * 60 * 1000);

    expect(await fs.pathExists(paths.entry)).toBe(true);
    const { reason, stdout, stderr } = await execaSafe(mm, ["build"], {
      cwd: testDirectory
    });

    expect(reason).toBeFalsy();
    expect(stderr).toMatchInlineSnapshot(`""`);
    expect(stdout).toMatchInlineSnapshot(
      `"MagicMirror built successfully! You can now start it with mm serve."`
    );
    expect(await fs.pathExists(paths.buildEntry)).toBe(true);
  });

  // test.skip("watches and serves in development mode", async () => {
  //   jest.setTimeout(5 * 60 * 1000);
  // });
});
