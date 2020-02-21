'use strict';

const pluginTester = require('babel-plugin-tester').default;
const plugin = require('../lib/babel-plugin-transform-mm2');

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
    babelrc: false,
    configFile: false,
    root: __dirname,
  }
});
