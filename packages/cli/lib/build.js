const Bundler = require("parcel-bundler");
const fs = require("fs");
const paths = require("./paths");
const chalk = require("chalk");
const formatError = require("./format-error");

module.exports = async (opts) => {
  try {
    return await build(opts);
  } catch (err) {
    console.log(formatError(err));
    return 1;
  }
}

async function build() {
  process.env.NODE_ENV = 'production';

  if (!fs.existsSync(paths.appIndexHtml)) {
    throw new Error(`Couldn't find ${paths.appIndexHtml}; maybe you need to run 'mm init'?`)
  }

  // Build the client bundle once in production mode,
  // or use whatever is in the build folder if there is no source code
  const bundler = new Bundler(paths.appIndexHtml, {
    outDir: paths.appBuild,
    target: "browser",
    watch: false,
    logLevel: 0
  });
  await bundler.bundle();
  console.log(`MagicMirror built ${chalk.bold.green("successfully")}! You can now start it with ${chalk.bold.cyan("mm serve")}.`);
  return 0;
}
