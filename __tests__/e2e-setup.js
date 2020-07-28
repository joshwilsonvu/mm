const execa = require("execa");
const path = require("path");
const fs = require("fs-extra");

const MAGICMIRROR_URL = "https://github.com/joshwilsonvu/MagicMirror.git";
const cwd = path.resolve(__dirname, "MagicMirror");
const paths = {
  cwd: cwd,
  entry: path.join(cwd, "src", "index.js"),
  buildHtml: path.join(cwd, "build", "index.html"),
  git: path.join(cwd, ".git"),
  packageJson: path.join(cwd, "package.json"),
};

// Run the following once if this module is required by any tests
beforeAll(async () => {
  if (
    !(await fs.pathExists(paths.git)) ||
    (process.env.CI && process.env.CI !== "false")
  ) {
    // if there isn't a copy of MagicMirror, clone the latest commit
    await fs.emptyDir(paths.cwd);
    await execa("git", ["clone", MAGICMIRROR_URL, paths.cwd, "--depth=1"], {
      cwd: __dirname,
    });
  } else {
    // if there is a copy of MagicMirror, update to the latest commit
    await execa("git", ["pull"], { cwd: paths.cwd });
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
    ["link", process.cwd() /* mm, not MagicMirror */, "--all", "--relative"],
    { cwd: paths.cwd }
  );
});

module.exports = paths;