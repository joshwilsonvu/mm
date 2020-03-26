const { Server } = require("./server");
const loadConfig = require("./config");
const paths = require("./paths");
const formatError = require("./format-error");

module.exports = async opts => {
  try {
    return await serve
  } catch (err) {
    console.log(formatError)
  }
}

function serve(argv) {
  const config = loadConfig(paths.appConfigJs);
  let server = new Server(config);
  server.listen();
}
