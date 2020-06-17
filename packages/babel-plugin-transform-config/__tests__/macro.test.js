const pluginTester = require("babel-plugin-tester").default;
const macrosPlugin = require("babel-plugin-macros");

// replaces project path with <PROJECT_ROOT> in absolute paths
const jestSerializerPath = require("jest-serializer-path");
expect.addSnapshotSerializer(jestSerializerPath);

pluginTester({
  plugin: macrosPlugin,
  tests: {
    works: {
      code: `
        import transformConfig from "../../macro";

        export default transformConfig({
          modules: [
            {
              module: "a-module",
              position: "top_left"
            }
          ]
        })
      `,
      snapshot: true,
    },
    "accepts a simple options object": {
      code: `
      import transformConfig from "../../macro";

      export default transformConfig({
        modules: [
          {
            module: "the-module"
          }
        ]
      }, {
        modulesPath: "../../custom-modules"
      })
      `,
      snapshot: true,
    },
  },
  babelOptions: {
    filename: require.resolve("./config/dummy"),
    babelrc: false,
    configFile: false,
    root: __dirname,
  },
});
