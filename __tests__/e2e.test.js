"use strict";

const fs = require("fs-extra");
const execa = require("execa");
const stripAnsi = require("strip-ansi");
const axios = require("axios");
const paths = require("./e2e-setup");

test("checks for type and linting errors", async () => {
  jest.setTimeout(5 * 60 * 1000);

  expect(await fs.pathExists(paths.entry)).toBe(true);
  const { all } = await execa("yarn", ["check"], {
    cwd: paths.cwd,
    all: true,
  });

  expect(stripAnsi(all)).toMatchInlineSnapshot();
});

test("builds in production mode", async () => {
  jest.setTimeout(5 * 60 * 1000);

  expect(await fs.pathExists(paths.entry)).toBe(true);
  // by default builds files but doesn't check for type or lint errors, for speed
  const { all } = await execa("yarn", ["build"], {
    cwd: paths.cwd,
    all: true,
  });

  expect(stripAnsi(all)).toMatch(/success/);
  expect(await fs.pathExists(paths.buildHtml)).toBe(true);
});
