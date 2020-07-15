const pluginTester = require("babel-plugin-tester").default;
const plugin = require("..");

pluginTester({
  plugin: plugin,
  pluginOptions: {
    imports: ["Module", "Log", "MM", "moment", "nunjucks", "SunCalc"],
  },
  tests: {
    "transforms MM2 modules": {
      code: `
        Module.register("helloworld", {
          foo: "bar"
        });
      `,
      snapshot: true,
      babelOptions: {
        filename: require.resolve("./dummy-module/dummy-module"), // basename matches dirname--this is an MM2 module file
        babelrc: false,
        configFile: false,
        root: __dirname,
      },
    },
    "skips non mm2 entry points": {
      code: `
        Module.register("helloworld", {});
      `,
      output: `
        Module.register("helloworld", {});
      `,
      babelOptions: {
        filename: require.resolve("./dummy-module/something-else"), // basename doesn't match dirname
        babelrc: false,
        configFile: false,
        root: __dirname,
      },
    },
    'rewrites require("node_helper")': {
      code: `
        const NodeHelper = require("node_helper");
      `,
      output: `
        const NodeHelper = require("@mm/node-helper");
      `,
      babelOptions: {
        babelrc: false,
        configFile: false,
      },
    },
  },
});
