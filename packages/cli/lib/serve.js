const { createApp, addNodeHelpers } = require("@mm/server");

function serve({ config, paths, argv }) {
  const app = createApp(config, { paths });
  addNodeHelpers(app);
  
}

module.exports = serve;