const Server = require("./shared/server");

module.exports = serve;

// will be applied with a CLI 'this' argument with config, paths, etc.
async function serve() {
  let server = Server(this.config, this.paths);
  server.listen();
}
