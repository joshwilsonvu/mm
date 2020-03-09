const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { execa, execaSafe } = require("./execa");
const waitForLocalhost = require("wait-for-localhost");

test.skip("builds in production mode", async () => {
  jest.setTimeout(10000);
  //expect.assertions(4)
  const testDirectory = path.join(__dirname, "__fixtures__", "basic");
  expect(fs.existsSync(path.join(testDirectory, "index.html"))).toBe(true);
  const { fulfilled, stdout, stderr } = await execa("yarn", ["mm", "build"], {
    cwd: testDirectory
  });

  expect(stdout).toMatchInlineSnapshot(`""`);
  expect(stderr).toMatchInlineSnapshot(`""`);
  expect(fulfilled).toBe(true);
});

test.todo("watches and serves in development mode");
