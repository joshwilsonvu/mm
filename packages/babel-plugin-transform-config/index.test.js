const babel = require("@babel/core");
const plugin = require("./index");

it("works", () => {
  const code = `
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
        module: "clock",
        position: "top_right"
      }
    ]
  };
  export default config;
  `;

  const {code: newCode} = babel.transformSync(code, {
    plugins: [plugin],
    compact: false
  });
  // transform expected code as no-op just to format whitespace well
  const {code: expected} = babel.transformSync(`
  const config = {
    port: 8080,
    modules: [
      {
        module: "helloworld",
        _import: () => import("modules/helloworld"),
        position: "top_left",
        config: {
          text: "Hello world"
        }
      },
      {
        module: "clock",
        _import: () => import("modules/clock"),
        position: "top_right"
      }
    ]
  };
  export default config;
  `, {
    plugins: [require("@babel/plugin-syntax-dynamic-import")],
    compact: false
  });
  expect(newCode).toStrictEqual(expected);
});