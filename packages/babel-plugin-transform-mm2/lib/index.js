"use strict";

const nodepath = require("path");

/*
 * This Babel plugin imports Module (and ...opts.imports) from "@mm/mm2" and exports the result
 * of Module.register, only in MM2-style modules.
 */
module.exports = function(babel) {
  const t = babel.types;
  return {
    name: "babel-plugin-transform-mm2",
    visitor: {
      /*
       * Replace "Module.register({...});" with "export default Module.register({...});"
       */
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
          // Add `import {Module, ...opts.imports} from "@mm/mm2";` to top of program
          const program = path.findParent(p => p.isProgram());
          const imports = (state.opts.imports || []).filter(imp => imp !== "Module");
          imports.unshift("Module");
          program.node.body.unshift(
            t.importDeclaration(
              // import all identifiers in plugin options.import
              imports.map(imp => t.importSpecifier(t.identifier(imp), t.identifier(imp))),
              t.stringLiteral("@mm/mm2")
            )
          );
        }
      },
      /*
       * Replace "require('node_helper')" with "require('@mm/node-helper')"
       * Only "require" is needed, as MM2 modules wouldn't be using ES6 imports
       */
      CallExpression(path) {
        if (path.get('callee').isIdentifier({ name: "require" })) {
          const args = path.get('arguments');
          if (args.length === 1 && args[0].isStringLiteral({ value: "node_helper" })) {
            args[0].replaceWith(t.stringLiteral("@mm/node-helper"));
          }
        }
      },
    },
  };
};