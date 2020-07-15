"use strict";

const nodepath = require("path");

/*
 * This Babel plugin imports Module (and ...opts.imports) from "@mm/mm2" and exports the result
 * of Module.register, only in MM2-style modules.
 */

exports.transformModuleDotRegister = function transformModuleDotRegister(
  t,
  path /* ExpressionStatement */,
  state,
  options
) {
  // bail if this is not the MM2 module file, i.e. not like /a/b/module-name/module-name.js
  const filename = state.file.opts.filename;
  const basename = nodepath.basename(filename, ".js");
  const dirname = nodepath.basename(nodepath.dirname(filename));
  if (basename !== dirname) {
    return;
  }
  // if this is "Module.register()", replace with "export default Module.register()"
  const expression = path.get("expression");
  if (
    expression.isCallExpression() &&
    expression.get("callee").isMemberExpression() &&
    expression.get("callee.object").isIdentifier({ name: "Module" }) &&
    expression.get("callee.property").isIdentifier({ name: "register" })
  ) {
    // Change `Module.register(...);` to `export default Module.register(...);`
    path.replaceWith(moduleDotExportsDeclaration(t, expression.node));
    // Add `import {Module, ...opts.imports} from "@mm/mm2";` to top of program
    const program = path.findParent((p) => p.isProgram());
    const imports = (options.imports || []).filter((imp) => imp !== "Module");
    imports.unshift("Module");
    program.node.body.unshift(requireExpression(t, imports, options.reqId || "@mm/mm2"));
  }
};

exports.transformRequireNodeHelper = function transformRequireNodeHelper(
  t,
  path /* CallExpression */
) {
  /*
   * Replace "require('node_helper')" with "require('@mm/node-helper')"
   * Only "require" is needed, as MM2 modules wouldn't be using ES6 imports
   */
  if (path.get("callee").isIdentifier({ name: "require" })) {
    const args = path.get("arguments");
    if (
      args.length === 1 &&
      args[0].isStringLiteral({ value: "node_helper" })
    ) {
      args[0].replaceWith(t.stringLiteral("@mm/node-helper"));
    }
  }
};

// module.exports = expr;
function moduleDotExportsDeclaration(t, exprNode) {
  return t.expressionStatement(
    t.assignmentExpression(
      "=",
      t.memberExpression(t.identifier("module"), t.identifier("exports")),
      exprNode
    )
  );
}

// const { a, b, c } = require("reqId");
function requireExpression(t, imports, reqId) {
  return t.variableDeclaration("const", [
    t.variableDeclarator(
      t.objectPattern(
        imports.map((imp) =>
          t.objectProperty(t.identifier(imp), t.identifier(imp), false, true)
        )
      ),
      t.callExpression(t.identifier("require"), [t.stringLiteral(reqId)])
    ),
  ]);
}
