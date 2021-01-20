const pluginTransform = require("./snowpack-plugin-transform");

jest.mock("fs-extra", () => ({
  __esModule: true,
  readFile: async () => `
    Module.register("helloworld", {
      foo: "bar"
    });
  `,
}));

describe("works", () => {
  let plugin;
  beforeAll(() => {
    plugin = pluginTransform(
      {},
      { cwd: "/home", modulesPath: "/home/modules" }
    );
  });

  test("has correct resolve fields", () => {
    expect(plugin.resolve.input).toEqual([".js"]);
    expect(plugin.resolve.output).toEqual([".js"]);
  });

  test("transforms an MM2 module", async () => {
    const result = await plugin.load({
      filePath: "/home/modules/foo/foo.js",
      fileExt: ".js",
    });
    expect(result).toHaveProperty(
      [".js", "code"],
      `import { Module, Log, MM, moment, nunjucks, SunCalc } from "magicmirror/mm2";
export default Module.register("helloworld", {
  foo: "bar"
});`
    );
    expect(result).toHaveProperty([".js", "map"]);
  });

  test("skips a normal module", async () => {
    const result = await plugin.load({
      filePath: "/home/modules/foo/a-file.js",
      fileExt: ".js",
    });
    expect(result).toBeUndefined();
  });
});
