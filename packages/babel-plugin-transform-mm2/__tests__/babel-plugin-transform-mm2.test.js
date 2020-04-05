

const pluginTester = require('babel-plugin-tester').default;
const plugin = require('..');

pluginTester({
  plugin: plugin,
  tests: {
    'transforms MM2 modules': {
      code: `
        Module.register("helloworld", {
          foo: "bar"
        });
      `,
      output: `
        import { Module } from "@mm/mm2";
        export default Module.register("helloworld", {
          foo: "bar"
        });
      `,
    },
  },
  babelOptions: {
    filename: require.resolve('./dummy-module/dummy-module'), // basename matches dirname--this is an MM2 module file
    babelrc: false,
    configFile: false,
    root: __dirname,
  }
});


pluginTester({
  plugin: plugin,
  tests: {
    'skips non mm2 entry points': {
      code: `
        Module.register("helloworld", {});
      `,
      output: `
        Module.register("helloworld", {});
      `,
    },
  },
  babelOptions: {
    filename: require.resolve('./dummy-module/something-else'), // basename doesn't match dirname
    babelrc: false,
    configFile: false,
    root: __dirname,
  }
});