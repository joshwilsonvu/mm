/*
 * This Babel plugin imports Module from "@mm/mm2" and exports the result
 * of Module.register, only in MM2-style modules.
 */
'use strict';
module.exports = function(babel) {
  const t = babel.types;
  return {
    name: "babel-plugin-transform-mm2",
    visitor: {
      ExpressionStatement(path) {
        const expression = path.get('expression');
        if (expression.isCallExpression()
        && expression.get('callee').isMemberExpression()
        && expression.get('callee.object').isIdentifier({ name: "Module" })
        && expression.get('callee.property').isIdentifier({ name: "register" })) {
          // Change `Module.register(...);` to `export default Module.register(...);`
          path.replaceWith(t.exportDefaultDeclaration(expression.node));
          // Add `import {Module} from "@mm/mm2";` to top of program
          const program = path.findParent(p => p.isProgram());
          program.node.body.unshift(
            t.importDeclaration(
              [t.importSpecifier(t.identifier("Module"), t.identifier("Module"))],
              t.stringLiteral("@mm/mm2")
            )
          );
        }
      },
    },
  };
};