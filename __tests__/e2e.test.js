'use strict';

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const execa = require("execa");
const stripAnsi = require("strip-ansi");

const MAGICMIRROR_URL = "https://github.com/joshwilsonvu/MagicMirror.git";
const cwd = path.resolve(__dirname, "MagicMirror");
const paths = {
  cwd: cwd,
  entry: path.join(cwd, "src", "index.js"),
  buildHtml: path.join(cwd, "build", "index.html"),
  git: path.join(cwd, ".git"),
};

describe("MagicMirror template works with mm packages", () => {
  beforeAll(async () => {
    jest.setTimeout(5 * 60 * 1000);

    if (!(await fs.pathExists(paths.git))) {
      // if there isn't a copy of MagicMirror, clone the latest commit
      await fs.emptyDir(paths.cwd);
      await execa("git", ["clone", MAGICMIRROR_URL, paths.cwd, "--depth=1"], { cwd: __dirname });
    } else {
      // if there is a copy of MagicMirror, update to the latest commit
      await execa("git", ["pull"], { cwd: paths.cwd });
    }

    // ensure yarn 2 is installed in the MagicMirror repo so that we can use $ yarn link --all
    const { stdout: yarnVersion } = await execa("yarn", ["--version"], { cwd: paths.cwd });
    expect(yarnVersion.startsWith("2.")).toBe(true);

    // use local @mm packages from this monorepo
    await execa("yarn", ["link", process.cwd() /* mm, not MagicMirror */, "--all"], { cwd: paths.cwd });
    await execa("yarn", ["install"], { cwd: paths.cwd });
  });

  test("builds in production mode", async () => {
    jest.setTimeout(5 * 60 * 1000);

    expect(await fs.pathExists(paths.entry)).toBe(true);
    const { stdout } = await execa("yarn", ["build"], {
      cwd: paths.cwd
    });

    expect(stripAnsi(stdout)).toMatchInlineSnapshot(`
    "$ mm build
    Compiled successfully.
    "
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
