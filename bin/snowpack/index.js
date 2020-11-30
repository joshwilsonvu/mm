const config = require("../shared/config");
const rollupPluginPnpResolve = require("rollup-plugin-pnp-resolve");

// On requests from the client, let the mm server handle it before Snowpack
let app;
const middleware = (req, res, next) => {
  if (!app) {
    const createServer = require("../shared/create-server");
    app = createServer().app;
  }
  app(req, res, next);
};

const snowpackConfig = {
  exclude: [
    // `!(${[paths.modules, paths.config, paths.src]
    //   .map((p) => `${p.replace(paths.cwd, "").replace(/^[/\\]/, "")`})
    //   .join("|")})`,
    "**/node[-_]helper.*",
    "__tests__/**/*",
    "magicmirror",
  ],
  devOptions: {
    open: "none",
    port: config.port || 8080,
    hostname: config.address || "127.0.0.1",
  },
  installOptions: {
    NODE_ENV: true,
    polyfillNode: true,
    rollup: { plugins: [rollupPluginPnpResolve()] },
    treeshake: false,
  },
  plugins: [
    require.resolve("@snowpack/plugin-babel"),
    //[require.resolve("@snowpack/plugin-babel"), { transformOptions: require("../shared/babel").config }],
    //require.resolve("./lint-plugin"),
  ],
  experiments: {
    app: middleware,
  },
};

module.exports = snowpackConfig;
