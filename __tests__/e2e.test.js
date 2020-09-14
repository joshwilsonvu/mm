"use strict";

const fs = require("fs-extra");
const execa = require("execa");
const stripAnsi = require("strip-ansi");
const paths = require("./e2e-setup");

// These tests are just for completeness, don't worry about running
// when not in continuous integration.
if (process.env.CI) {
  test("checks for type and linting errors", async () => {
    jest.setTimeout(5 * 60 * 1000);

    expect(await fs.pathExists(paths.entry)).toBe(true);
    let { all } = await execa("yarn", ["check"], {
      cwd: paths.cwd,
      all: true,
    });
    all = stripAnsi(all);

    expect(all).toMatch(/done/i);
  });
}

test("builds in production mode", async () => {
  jest.setTimeout(5 * 60 * 1000);

  expect(await fs.pathExists(paths.entry)).toBe(true);
  // by default builds files but doesn't check for type or lint errors, for speed
  let { all } = await execa("yarn", ["build"], {
    cwd: paths.cwd,
    all: true,
  });
  all = stripAnsi(all);

  expect(all).toMatch(/done/i);
  expect(await fs.pathExists(paths.buildHtml)).toBe(true);
});
