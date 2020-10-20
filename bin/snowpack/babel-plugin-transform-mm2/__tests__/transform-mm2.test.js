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
      output: `
        import { Module, Log, MM, moment, nunjucks, SunCalc } from "magicmirror/mm2";
        export default Module.register("helloworld", {
          foo: "bar",
        });
      `,
      babelOptions: {
        babelrc: false,
        configFile: false,
        root: __dirname,
      },
    },
  },
});
