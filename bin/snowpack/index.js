const path = require("path");
// const paths = require("../shared/paths");
const config = require("../shared/config");
const rollupPluginPnpResolve = require("rollup-plugin-pnp-resolve");

// On requests from the client, let the mm server handle it before Snowpack
const middleware = (() => {
  let app;
  return (req, res, next) => {
    if (!app) {
      const createServer = require("../shared/create-server");
      app = createServer().app;
    }
    app(req, res, next);
  };
})();

const exclude = [
  // `!(${[paths.modules, paths.config, paths.src]
  //   .map((p) => `${p.replace(paths.cwd, "").replace(/^[/\\]/, "")`})
  //   .join("|")})`,
  "**/node[-_]helper.*",
  "__tests__/**/*",
  "magicmirror",
];
console.log(exclude);

const snowpackConfig = {
  exclude,
  devOptions: {
    open: "none",
    port: config.port || 8080,
    hostname: config.address || "127.0.0.1",
  },
  buildOptions: {
    clean: true,
  },
  installOptions: {
    NODE_ENV: true,
    alias: {
      node_helper: "magicmirror/node-helper",
    },
    rollup: { plugins: [rollupPluginPnpResolve()] },
  },
  plugins: [
    require.resolve("./transform-plugin"),
    require.resolve("./lint-plugin"),
  ],
  experiments: {
    app: middleware,
  },
};

module.exports = snowpackConfig;
