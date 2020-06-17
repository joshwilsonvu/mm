const { createMacro } = require("babel-plugin-macros");
const transformConfig = require("./lib/transform-config");
const assert = require("assert");

module.exports = createMacro(transformConfigMacro);

function transformConfigMacro({ state, babel, references }) {
  const paths = Array.isArray(references) ? references : references.default;
  const t = babel.types;
  // validate all references first
  paths.forEach((path) => {
    t.assertIdentifier(path);
    t.assertCallExpression(path.parentPath);
    const args = path.parentPath.get("arguments");
    assert(
      args.length >= 1 && args.length <= 2,
      `${path.node.name} should be called with 1-2 arguments`
    );
    t.assertObjectExpression(args[0]);
    if (args.length === 2) {
      t.assertObjectExpression(args[1]);
    }
  });
  paths.forEach((path) => {
    const optionsLiteral = path.parentPath.get("arguments")[1];
    let options = {};
    if (optionsLiteral) {
      // Can't evaluate complex objects in Babel, so optionsLiteral must have string literal values only
      optionsLiteral.get("properties").forEach((property) => {
        assert(
          !property.node.computed,
          "Can't use a computed property in macro options"
        );
        property.get("value").assertStringLiteral();

        const keyPath = property.get("key");
        const key = keyPath.isStringLiteral()
          ? keyPath.node.value
          : /* identifier */ keyPath.node.name;
        const value = property.node.value.value;
        switch (key) {
          case "modulesPath":
            // generate absolute path to modules folder based on relative or absolute path given as modulesPath option
            options[key] = value;
            break;
          default:
            break;
        }
      });
    }
    const objectExpression = path.parentPath.get("arguments")[0];
    transformConfig(t, objectExpression, state, { ...state.opts, ...options });
    path.parentPath.replaceWith(objectExpression);
  });
}
