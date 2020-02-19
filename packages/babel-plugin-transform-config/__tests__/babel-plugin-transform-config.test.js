'use strict';

const pluginTester = require('babel-plugin-tester');
const plugin = require('../lib/babel-plugin-transform-config');

pluginTester({
  plugin: plugin,
  tests: {
    "adds import": {
      code: `
        const config = {
          port: 8080,
          modules: [
            {
              module: "helloworld",
              position: "top_left",
              config: {
                text: "Hello world"
              }
            },
            {
              module: "MMM-clock",
              position: "top_right"
            }
          ]
        };
        export default config;
      `,
      output: `
        const config = {
          port: 8080,
          modules: [
            {
              module: "helloworld",
              _import: () => import("../modules/default/helloworld/helloworld"),
              position: "top_left",
              config: {
                text: "Hello world"
              }
            },
            {
              module: "MMM-clock",
              _import: () => import("../modules/MMM-clock/MMM-clock"),
              position: "top_right"
            }
          ]
        };
        export default config;
      `
    }
  },
  babelOptions: {
    babelrc: false,
    configFile: false,
  },
  filename: require.resolve("./config/dummy")
});

// test('transform', () => {
//   let original, transformed, expected;
//   original = `
//       const config = {
//         port: 8080,
//         modules: [
//           {
//             module: "helloworld",
//             position: "top_left",
//             config: {
//               text: "Hello world"
//             }
//           },
//           {
//             module: "MMM-clock",
//             position: "top_right"
//           }
//         ]
//       };
//       export default config;
//     `;
//   transformed = babel.transformSync(original, {
//     plugins: [plugin],
//     compact: false,
//     filename: require.resolve("./config/dummy"),
//   }).code;
//   expected = babel.transformSync(
//     `
//       const config = {
//         port: 8080,
//         modules: [
//           {
//             module: "helloworld",
//             _import: () => import("../modules/default/helloworld/helloworld"),
//             position: "top_left",
//             config: {
//               text: "Hello world"
//             }
//           },
//           {
//             module: "MMM-clock",
//             _import: () => import("../modules/MMM-clock/MMM-clock"),
//             position: "top_right"
//           }
//         ]
//       };
//       export default config;
//       `,
//     {
//       plugins: [require('@babel/plugin-syntax-dynamic-import')],
//       compact: false,
//       filename: require.resolve("./config/dummy"),
//     }
//   ).code;

//   expect(transformed).toContain('_import');
//   expect(transformed).toStrictEqual(expected);
// });
