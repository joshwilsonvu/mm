const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const uniqueFilename = require("unique-filename");
const execa = require("execa");
const stripAnsi = require("strip-ansi");
const cliPath = require.resolve("@mm/cli");

describe.each([[path.join(__dirname, "__fixtures__", "basic")]])(
  "execa fixture '%s'",
  _fixtureDirectory => {
    const paths = setup(_fixtureDirectory);

    test("builds in production mode", async () => {
      jest.setTimeout(5 * 60 * 1000);

      expect(await fs.pathExists(paths.entry)).toBe(true);
      const result = await execa(cliPath, ["build"], {
        all: true,
        cwd: paths.cwd
      });

      expect(result.exitCode).toBe(0);
      expect(stripAnsi(result.all)).toMatchInlineSnapshot(
        `"MagicMirror built successfully! You can now start it with mm serve."`
      );
      expect(await fs.pathExists(paths.buildEntry)).toBe(true);
    });

    test("watches and serves in development mode", async () => {
      jest.setTimeout(60 * 1000);

      expect(await fs.pathExists(paths.entry)).toBe(true);
      const subprocess = execa(cliPath, ["dev", "--serveronly"], {
        all: true,
        cwd: paths.cwd
      });

      // wait for server to start up
      await delay(10000);
      let response = await axios.get("http://localhost:8080/version")
      expect(response.data).toMatchInlineSnapshot(`"0.0.0"`);
      response = await axios.get("http://localhost:8080/");
      expect(response.data).toMatch(/<script src=/);
      expect(response.status).toBe(200);

      // test hot reloading output in snapshot
      fs.appendFileSync(paths.entry, "\n\n\n"); // modify the entry file to activate watcher
      await delay(1000);

      subprocess.cancel();
      try {
        await subprocess;
      } catch (error) {
        expect(error.isCanceled).toBe(true);
        expect(stripAnsi(error.all)).toMatchInlineSnapshot(`
          "Starting server on port 8080...
          - Building...
          ✔ MagicMirror built successfully!
          - Building...
          ✔ MagicMirror built successfully!"
        `);
      }
    });
  }
);

function setup(_fixtureDirectory) {
  let testDirectory = "";
  const paths = {
    get cwd() {
      return testDirectory;
    },
    get entry() {
      return path.join(testDirectory, "index.html");
    },
    get buildEntry() {
      return path.join(testDirectory, "build", "index.html");
    }
  };
  // Copy the fixture to a temporary directory and run tests there
  beforeEach(async () => {
    expect(testDirectory).toBeFalsy();
    expect(await fs.pathExists(_fixtureDirectory)).toBe(true);
    testDirectory = uniqueFilename(
      path.join(__dirname, "__fixtures__"),
      path.basename(_fixtureDirectory)
    );
    await fs.copy(_fixtureDirectory, testDirectory);
    //process.chdir(testDirectory);
  });
  // Clean up the temporary test directory
  afterEach(async () => {
    expect(testDirectory).toBeTruthy();
    expect(await fs.pathExists(testDirectory)).toBe(true);
    //process.chdir(originalCwd);
    await fs.remove(testDirectory);
    testDirectory = "";
  });

  return paths;
}

function delay(ms) {
  return new Promise(res => setTimeout(res, ms >>> 0));
}
