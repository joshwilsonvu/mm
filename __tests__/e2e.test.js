const fs = require("fs");
const path = require("path");
const axios = require("axios");
const execa = require("execa");
const waitForLocalhost = require("wait-for-localhost");


let cwd;
beforeAll(() => (cwd = process.cwd()));
afterEach(() => process.chdir(cwd));

test.skip("builds and serves in production mode", async () => {
  jest.setTimeout(10000);
  //expect.assertions(4)
  process.chdir(path.join(__dirname, "__fixtures__", "basic"));
  expect(fs.existsSync("index.html")).toBe(true);
  const subprocess = execa("node", [path.resolve(__dirname, "..", "bin", "cli.js")]);
  await waitForLocalhost({ port: 8080 });
  expect(await axios.get("https://localhost:8080")).toMatchSnapshot();
  await subprocess.kill()

  expect(subprocess.isCanceled).toBe(true);
  expect(subprocess.stdout).toMatchInlineSnapshot(`undefined`);
});

test.todo("watches and serves in development mode");

async function delay(ms) {
  return Promise.resolve(res => setTimeout(res, ms));
}









