const { Server } = require("./server");
const loadConfig = require("./load-config");
const paths = require("./paths");

module.exports = serve;

async function serve(opts) {
  const config = loadConfig(paths.appConfigJs);
  let server = new Server(config);
  server.listen();
}
