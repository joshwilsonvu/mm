"use strict";

const fs = require("fs-extra");
const execa = require("execa");
const stripAnsi = require("strip-ansi");
const axios = require("axios");
const paths = require("./e2e-setup");

test("builds in production mode", async () => {
  jest.setTimeout(5 * 60 * 1000);

  expect(await fs.pathExists(paths.entry)).toBe(true);
  const { all } = await execa("yarn", ["build"], {
    cwd: paths.cwd,
    all: true,
  });

  expect(stripAnsi(all)).toMatch(/success/);
  expect(await fs.pathExists(paths.buildHtml)).toBe(true);
});

test("starts and watches in development mode", async () => {
  jest.setTimeout(60 * 1000);
  const paths = require("./e2e-setup");

  expect(await fs.pathExists(paths.entry)).toBe(true);
  const subprocess = execa("yarn", ["mm", "start", "--no-view"], {
    cwd: paths.cwd,
  });

  // wait for server to start up
  await matchStream(subprocess.stdout, /listening/i);
  const response = await axios.get("http://127.0.0.1:8080/index.html");
  expect(response.data).toMatch(/<script src=/);
  expect(response.status).toBe(200);

  // test hot reloading output in snapshot
  await touch(paths.entry); // simulate saving the file to activate watcher
  await matchStream(subprocess.stdout, /./, 3000); // wait for stdout to change
  console.log("got here");

  subprocess.stdin.end("q"); // "q" to quit from command line

  console.log(subprocess.pid);
  subprocess.kill("SIGINT");
  subprocess.kill("SIGTERM", { forceKillAfterTimeout: 1000 });
  //expect(subprocess.isKilled).toBe(true);

  // try {
  //   await subprocess;
  // } catch (error) {
  //   console.log("got here too");
  //   expect(error.isCanceled).toBe(true);
  //   expect(stripAnsi(error.stdout)).toMatchInlineSnapshot();
  // }
});

function matchStream(stream, regex, timeout = 10000) {
  return Promise.race([
    new Promise((resolve) => {
      function listener(data) {
        console.log(data.toString());
        if (data.toString().match(regex)) {
          stream.off("data", listener);
          resolve();
        }
      }
      stream.on("data", listener);
    }),
    new Promise((_, reject) =>
      setTimeout(() => {
        reject(new Error(`timed out (${timeout} ms) waiting for ${regex}`));
      }, timeout)
    ),
  ]);
}

async function touch(filename) {
  const time = new Date();
  try {
    await fs.utimes(filename, time, time);
  } catch (err) {
    await fs.close(await fs.open(filename, "w"));
  }
}
