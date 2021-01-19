const pluginTester = require("babel-plugin-tester").default;
const plugin = require("..");
const path = require("path");

// replaces project path with <PROJECT_ROOT> in absolute paths
const jestSerializerPath = require("jest-serializer-path");
expect.addSnapshotSerializer(jestSerializerPath);

pluginTester({
  plugin: plugin,
  pluginOptions: {
    modulesPath: path.resolve(__dirname, "modules"),
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  tests: {
    "resolves a module and adds _path, _helperPath": {
      code: `
        export default {
          port: 8080,
          modules: [
            {
              module: "a-module",
              position: "top_right",
            },
          ],
        };
      `,
      output: `
        export default {
          port: 8080,
          modules: [
            {
              module: "a-module",
              _helperPath: "a-module/node-helper.js",
              _path: "a-module/a-module.js",
              position: "top_right",
            },
          ],
        };
      `,
    },
    "resolves default modules": {
      code: `
        export default {
          modules: [
            {
              module: "a-default-module"
            },
          ],
        };
      `,
      output: `
        export default {
          modules: [
            {
              module: "a-default-module",
              _path: "default/a-default-module/a-default-module.js",
            },
          ],
        };
      `,
    },
    "resolves `index` files and/or `.tsx` files": {
      code: `
        export default {
          modules: [
            {
              module: "a-ts-module"
            },
          ],
        };
      `,
      output: `
        export default {
          modules: [
            {
              module: "a-ts-module",
              _path: "a-ts-module/index.tsx",
            },
          ],
        };
      `,
    },
    "throws for nonexistent modules": {
      code: `
        export default {
          modules: [
            {
              module: "a-nonexistent-module"
            },
          ],
        };
      `,
      error: SyntaxError,
    },
    "bails if .disabled === true": {
      code: `
        export default {
          modules: [
            {
              module: "a-module",
              disabled: true,
            },
          ],
        };
      `,
    },
  },
  babelOptions: {
    babelrc: false,
    configFile: false,
    root: __dirname,
  },
});
