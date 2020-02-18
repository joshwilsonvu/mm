const { makeCompat, Module } = require("..");

test("Module", () => {
  const Subclass = Module.register("Test", {
    myMethod: function() {
      return 5;
    }
  });
  const instance = new Subclass();
  expect(instance).toBeInstanceOf(Module);
  expect(instance.myMethod()).toBe(5);
});

test("makeCompat", () => {
  expect(typeof makeCompat).toBe("function");
})