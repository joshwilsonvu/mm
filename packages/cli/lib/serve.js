const { Server } = require("./shared/server");

module.exports = serve;

// will be applied with a CLI 'this' argument with config, paths, etc.
async function serve() {
  let server = new Server(this.config);
  server.listen();
}
