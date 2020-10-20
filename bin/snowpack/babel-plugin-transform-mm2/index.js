"use strict";

module.exports = function (babel) {
  return {
    name: "babel-plugin-transform-mm2",
    inherits: require("@babel/plugin-syntax-jsx").default,
    visitor: {
      ExpressionStatement(path, state) {
        transformModuleDotRegister(babel.types, path, state);
      },
    },
  };
};

/*
 * This Babel plugin imports Module (and ...opts.imports) from "@mm/mm2" and exports the result
 * of Module.register, only in MM2-style modules.
 */
function transformModuleDotRegister(t, path /* ExpressionStatement */, state) {
  // if this is "Module.register()", replace with "export default Module.register()"
  const expression = path.get("expression");
  if (
    expression.isCallExpression() &&
    expression.get("callee").isMemberExpression() &&
    expression.get("callee.object").isIdentifier({ name: "Module" }) &&
    expression.get("callee.property").isIdentifier({ name: "register" })
  ) {
    // Change `Module.register(...);` to `export default Module.register(...);`
    path.replaceWith(t.exportDefaultDeclaration(expression.node));
    // Add `import {Module, ...opts.imports} from "@mm/mm2";` to top of program
    const program = path.findParent((p) => p.isProgram());
    const imports = (state.opts.imports || []).filter(
      (imp) => imp !== "Module"
    );
    imports.unshift("Module");
    program.node.body.unshift(
      t.importDeclaration(
        imports.map((i) => t.importSpecifier(t.identifier(i), t.identifier(i))),
        t.stringLiteral(state.opts.reqId || "magicmirror/mm2")
      )
    );
  }
}
