'use strict';

const babel = require('@babel/core');
const plugin = require('../lib/babel-plugin-transform-mm2');

test('transform', () => {
  let original, transformed, expected;
    original = `
    Module.register("helloworld",{
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
    `;
    transformed = babel.transformSync(original, {
      plugins: [plugin],
      compact: false,
      filename: require.resolve('./dummy'),
    }).code;
    expected = babel.transformSync(
      `
      import {Module} from "@mm/mm2";
      export default Module.register("helloworld",{
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
      {
        compact: false,
        filename: require.resolve('./dummy'),
      }
    ).code;

    expect(transformed).toStrictEqual(expected);
    expect(transformed).toContain('export default');
    expect(transformed).toContain('"@mm/mm2"');
});
