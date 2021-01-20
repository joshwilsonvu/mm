module.exports = function snowpackPluginTransformMM2(_, pluginOptions) {
  const { cwd = process.cwd(), modulesPath } = pluginOptions;
  return {
    resolve: {
      input: [".js"],
      output: [".js"],
    },
    knownEntrypoints: ["magicmirror/mm2"],
    async load({ filePath, fileExt }) {
      // MM2 modules are always .js files
      if (fileExt !== ".js") {
        return;
      }
      // Must be within modulesPath
      const path = require("path");
      if (modulesPath) {
        const relative = path.relative(modulesPath, filePath);
        if (
          !relative ||
          relative.startsWith("..") ||
          path.isAbsolute(relative)
        ) {
          return;
        }
      }

      // MM2 module files have the same name as their directories, i.e. .../foo/foo.js
      if (
        path.basename(filePath, ".js") !== path.basename(path.dirname(filePath))
      ) {
        return;
      }

      // Parse the file to see if it's a well-formed MM2 module file
      const babel = require("@babel/core");
      const fs = require("fs-extra");
      const contents = await fs.readFile(filePath, "utf-8");
      let ast;
      try {
        ast = await babel.parseAsync(contents, {
          root: cwd,
          babelrc: false,
          configFile: false,
          sourceType: "module",
        });
      } catch (e) {
        // Failure to parse means this is not a well-formed MM2 module;
        // bail and try next loader plugin.
        console.error(e);
        return;
      }

      // Search for an expression statement starting with `Module.register(...)`.
      const t = babel.types;
      let matches = false;
      for (const [i, node] of ast.program.body.entries()) {
        if (t.isExpressionStatement(node)) {
          const expression = node.expression;
          if (
            t.isCallExpression(expression) &&
            t.isMemberExpression(expression.callee) &&
            t.isIdentifier(expression.callee.object, { name: "Module" }) &&
            t.isIdentifier(expression.callee.property, { name: "register" })
          ) {
            matches = true;
            // Change `Module.register(...);` to `export default Module.register(...);`
            ast.program.body[i] = t.exportDefaultDeclaration(expression);
            // Add `import {Module, ...} from "magicmirror/mm2";` to top of program
            const imports = [
              "Module",
              "Log",
              "MM",
              "moment",
              "nunjucks",
              "SunCalc",
            ];
            ast.program.body.unshift(
              t.importDeclaration(
                imports.map((i) =>
                  t.importSpecifier(t.identifier(i), t.identifier(i))
                ),
                t.stringLiteral("magicmirror/mm2")
              )
            );
            break; // done searching
          }
        }
      }

      if (!matches) {
        return; // not a well-formed MM2 file, pass to next loader plugin
      }

      // Load the file with the ast changes. No need to run any plugins, because
      // MM2 module files will only have browser-runnable syntax
      const generate = require("@babel/generator").default;
      const { code, map } = generate(
        ast,
        {
          comments: true,
          filename: filePath,
          sourceMaps: true,
          sourceFileName: filePath,
        },
        contents
      );
      return {
        ".js": {
          code,
          map,
        },
      };
    },
  };
};
