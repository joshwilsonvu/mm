'use strict';

const pluginTester = require('babel-plugin-tester').default;
const plugin = require('../lib/babel-plugin-transform-config');

pluginTester({
  plugin: plugin,
  tests: {
    "adds import": {
      code: `
        const config = {
          port: 8080,
          modules: [
            {
              module: "helloworld",
              position: "top_left",
              config: {
                text: "Hello world"
              }
            },
            {
              module: "MMM-clock",
              position: "top_right"
            }
          ]
        };
        export default config;
      `,
      output: `
        const config = {
          port: 8080,
          modules: [
            {
              module: "helloworld",
              _import: () => import("../modules/default/helloworld/helloworld"),
              position: "top_left",
              config: {
                text: "Hello world"
              }
            },
            {
              module: "MMM-clock",
              _import: () => import("../modules/MMM-clock/MMM-clock"),
              position: "top_right"
            }
          ]
        };
        export default config;
      `
    },
  },
  babelOptions: {
    filename: require.resolve("./config/dummy"),
    babelrc: false,
    configFile: false,
    root: __dirname,
  },
});
