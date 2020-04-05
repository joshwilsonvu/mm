

const pluginTester = require('babel-plugin-tester').default;
const plugin = require('..');

pluginTester({
  plugin: plugin,
  tests: {
    'transforms MM2 modules': {
      code: `
        Module.register("helloworld", {
          // Default module config.
          defaults: {
            text: "Hello World!"
          },
          // Override dom generator.
          getDom: function() {
            var wrapper = document.createElement("div");
            wrapper.innerHTML = this.config.text;
            return wrapper;
          }
        });
      `,
      output: `
        import { Module } from "@mm/mm2";
        export default Module.register("helloworld", {
          // Default module config.
          defaults: {
            text: "Hello World!"
          },
          // Override dom generator.
          getDom: function() {
            var wrapper = document.createElement("div");
            wrapper.innerHTML = this.config.text;
            return wrapper;
          }
        });
      `,
    },
  },
  babelOptions: {
    filename: "/root/modules/asdf/asdf.js", // basename matches dirname--this is an MM2 module file
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
    filename: "/root/modules/asdf/ghjkl.js", // basename doesn't match dirname
    babelrc: false,
    configFile: false,
    root: __dirname,
  }
});