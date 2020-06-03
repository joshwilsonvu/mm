

const pluginTester = require('babel-plugin-tester').default;
const plugin = require('..');

pluginTester({
  plugin: plugin,
  pluginOptions: {
    imports: ["optionalImport", "Module"]
  },
  tests: {
    'transforms MM2 modules': {
      code: `
        Module.register("helloworld", {
          foo: "bar"
        });
      `,
      // "Module" is included even if not given and listed first
      output: `
        import { Module, optionalImport } from "@mm/mm2";
        export default Module.register("helloworld", {
          foo: "bar"
        });
      `,
      babelOptions: {
        filename: require.resolve('./dummy-module/dummy-module'), // basename matches dirname--this is an MM2 module file
        babelrc: false,
        configFile: false,
        root: __dirname,
      }
    },
    'skips non mm2 entry points': {
      code: `
        Module.register("helloworld", {});
      `,
      output: `
        Module.register("helloworld", {});
      `,
      babelOptions: {
        filename: require.resolve('./dummy-module/something-else'), // basename doesn't match dirname
        babelrc: false,
        configFile: false,
        root: __dirname,
      }
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
      }
    },
  },
});