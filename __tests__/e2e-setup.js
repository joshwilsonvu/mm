const execa = require("execa");
const path = require("path");
const fs = require("fs-extra");
const copy = require("recursive-copy");
const tmp = require("tmp");

const MAGICMIRROR_URL = "https://github.com/joshwilsonvu/MagicMirror.git";

let cwd = path.join(tmp.dirSync().name, "MagicMirror");
const paths = {
  cwd: cwd,
  entry: path.join(cwd, "src", "index.js"),
  buildHtml: path.join(cwd, "build", "index.html"),
  git: path.join(cwd, ".git"),
  packageJson: path.join(cwd, "package.json"),
  local: path.join(__dirname, "..", "..", "MagicMirror"),
};

// Run the following once if this module is required by any tests
beforeAll(async () => {
  jest.setTimeout(5 * 60 * 1000);
  await fs.ensureDir(paths.cwd);
  if (await fs.pathExists(paths.local)) {
    // if a copy of MagicMirror is checked out locally alongside mm,
    // copy it to paths.cwd.
    await copy(paths.local, paths.cwd, {
      expand: true,
      dot: true,
    });
  } else {
    // clone the latest commit
    await execa("git", ["clone", MAGICMIRROR_URL, paths.cwd, "--depth=1"], {
      cwd: __dirname,
    });
  }

  // ensure yarn 2 is installed in the MagicMirror repo so that we can use $ yarn link --all
  const { stdout: yarnVersion } = await execa("yarn", ["--version"], {
    cwd: paths.cwd,
  });
  expect(yarnVersion.startsWith("2.")).toBe(true);

  // use local @mm packages from this monorepo, after removing any @mm/ resolutions from the cloned repo
  const packageJson = await fs.readJson(paths.packageJson);
  if (packageJson.resolutions) {
    for (let resolution of Object.keys(packageJson.resolutions)) {
      if (resolution.startsWith("@mm/")) {
        delete packageJson.resolutions[resolution];
      }
    }
  }
  await fs.writeJson(paths.packageJson, packageJson);
  await execa(
    "yarn",
    ["link", path.resolve(__dirname, ".."), "--all", "--relative"],
    { cwd: paths.cwd }
  );
});

afterAll(() => fs.remove(paths.cwd));

module.exports = paths;
