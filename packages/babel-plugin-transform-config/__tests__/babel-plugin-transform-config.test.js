

const pluginTester = require('babel-plugin-tester').default;
const plugin = require('..');

// replaces project path with <PROJECT_ROOT> in absolute paths
const jestSerializerPath = require('jest-serializer-path');
expect.addSnapshotSerializer(jestSerializerPath);

const filename = require.resolve('./config/dummy');
pluginTester({
  plugin: plugin,
  tests: {
    "adds _component, _path to modules": {
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
      snapshot: true,
    },
    // correctly resolves modules in a "modules/default" folder
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
      snapshot: true,
    },
    "throws for nonexistent modules": {
      code: `
        export default {
          modules: [
            {
              module: "a-nonexistent-module"
            }
          ]
        };
      `,
      error: SyntaxError,
    }
  },
  babelOptions: {
    filename: filename,
    babelrc: false,
    configFile: false,
    root: __dirname,
  },
});
