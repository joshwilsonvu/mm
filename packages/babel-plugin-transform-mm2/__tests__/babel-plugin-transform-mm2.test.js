'use strict';

const babel = require('@babel/core');
const plugin = require('..');

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
      }
    ).code;

    expect(transformed).toStrictEqual(expected);
    expect(transformed).toContain('export default');
    expect(transformed).toContain('"@mm/mm2"');
});
