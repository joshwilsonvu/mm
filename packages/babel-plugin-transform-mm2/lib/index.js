const nodepath = require("path");

/*
 * This Babel plugin imports Module from "@mm/mm2" and exports the result
 * of Module.register, only in MM2-style modules.
 */
module.exports = function(babel) {
  const t = babel.types;
  // find the relative path to the nearest modules/ folder within the project

  return {
    name: "babel-plugin-transform-mm2",
    visitor: {
      ExpressionStatement(path, state) {
        // bail if this is not the MM2 module file, i.e. not like /a/b/module-name/module-name.js
        const filename = state.file.opts.filename;
        const basename = nodepath.basename(filename, ".js");
        const dirname = nodepath.basename(nodepath.dirname(filename));
        if (basename !== dirname) {
          return;
        }
        // if this is "Module.register()", replace with "export default Module.register()"
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