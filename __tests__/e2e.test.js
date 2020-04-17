const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const execa = require("execa");
const stripAnsi = require("strip-ansi");

describe("MagicMirror source", () => {
  const paths = {
    cwd: path.resolve("MagicMirror"),
    entry: path.resolve("MagicMirror", "src", "index.js"),
    buildHtml: path.resolve("MagicMirror", "build", "index.html")
  };

  beforeAll(async () => {
    await execa("yarn", ["install", "--frozen-lockfile"], {
      cwd: paths.cwd
    });
  });

  test("builds in production mode", async () => {
    jest.setTimeout(5 * 60 * 1000);

    if (!(await fs.pathExists(paths.cwd))) {
      console.log(
        "To run an end-to-end test, clone MagicMirror into the root folder of this repository."
      );
      return;
    }

    expect(await fs.pathExists(paths.entry)).toBe(true);
    const { stdout } = await execa("yarn", ["build"], {
      cwd: paths.cwd
    });

    expect(stripAnsi(stdout)).toMatchInlineSnapshot(`
      "$ mm build
      Compiled successfully!"
    `);
    expect(await fs.pathExists(paths.buildHtml)).toBe(true);
  });

  test.skip("starts and watches in development mode", async () => {
    jest.setTimeout(60 * 1000);

    expect(await fs.pathExists(paths.entry)).toBe(true);
    const subprocess = execa("yarn", ["start", "--serveronly"], {
      cwd: paths.cwd
    });

    // wait for server to start up
    await delay(10000);
    let response = await axios.get("http://localhost:8080/version");
    expect(response.data).toMatchInlineSnapshot(`"0.0.0"`);
    response = await axios.get("http://localhost:8080/");
    expect(response.data).toMatch(/<script src=/);
    expect(response.status).toBe(200);

    // test hot reloading output in snapshot
    await fs.appendFile(paths.entry, "\n\n\n"); // modify the entry file to activate watcher
    await delay(1000);

    subprocess.cancel();
    try {
      await subprocess;
    } catch (error) {
      expect(error.isCanceled).toBe(true);
      expect(stripAnsi(error.stdout)).toMatchInlineSnapshot();
    }
  });
});

function delay(ms) {
  return new Promise(res => setTimeout(res, ms >>> 0));
}
