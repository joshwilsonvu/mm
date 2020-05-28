const Server = require("./shared/server");
const fs = require("fs");
const openBrowser = require("react-dev-utils/openBrowser");

// will be applied with a CLI 'this' argument with config, paths, etc.
module.exports = serve;
async function serve() {
  if (this.options.build) {
    if (!fs.existsSync(this.paths.appBuild) || fs.readdirSync(this.paths.appBuild).length === 0) {
      this.console.info(`No files found at ${this.paths.appBuild}. Building...`);
      this.options._ = ['build'];
      await this.run();
    }
  }

  let server = await Server(this.config, this.paths);
  server.listen();

  if (this.options.browser) {
    openBrowser(this.config.url);
  }
}
