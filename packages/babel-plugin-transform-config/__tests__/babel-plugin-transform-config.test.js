

const pluginTester = require('babel-plugin-tester').default;
const plugin = require('..');

pluginTester({
  plugin: plugin,
  tests: {
    "adds import to modules": {
      code: `
        export default {
          port: 8080,
          modules: [
            {
              module: "a-module",
              position: "top_right"
            }
          ]
        };
      `,
      output: `
        export default {
          port: 8080,
          modules: [
            {
              module: "a-module",
              _import: () => import("../modules/a-module/a-module"),
              position: "top_right"
            }
          ]
        };
      `,
    },
    "resolves default modules": {
      code: `
      export default {
        modules: [
          {
            module: "a-default-module"
          }
        ]
      };
    `,
    output: `
      export default {
        modules: [
          {
            module: "a-default-module",
            _import: () =>
              import("../modules/default/a-default-module/a-default-module")
          }
        ]
      };
    `,
    }
  },
  babelOptions: {
    filename: require.resolve("./config/dummy"),
    babelrc: false,
    configFile: false,
    root: __dirname,
  },
});
