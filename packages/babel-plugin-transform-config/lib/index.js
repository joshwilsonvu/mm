/*
 * This Babel plugin adds imports to the config file, so that the MagicMirror
 * core component can find all of its dependencies correctly.
 *
 * Transforms this:
 * {
 *   ...
 *   modules: [
 *     {
 *       module: "module-name",
 *       ...otherProperties: "anything"
 *     },
 *     ...
 *   ],
 *   ...
 * }
 * into this:
 * {
 *   ...
 *   modules: [
 *     {
 *       module: "module-name",
 *       ...otherProperties: "anything",
 *   ==> _component: require("react").lazy(() => import("modules/module-name")) <==
 *     },
 *     ...
 *   ],
 *   ...
 * }
 */

"use strict";

const nodepath = require("path");
const fs = require("fs");
const memoize = require("memoize-one");
const { createRequire } = require("module");

module.exports = function (babel) {
  const t = babel.types;
  t.isIdentifierOrLiteral = (node, name) =>
    t.isIdentifier(node, { name }) || t.isStringLiteral(node, { value: name });
  const buildReactLazy = path => (
    // require("react").lazy(() => import("<path>"))
    // (we can require React multiple times without a problem)
    t.callExpression(
      t.memberExpression(
        t.callExpression(
          t.identifier("require"),
          [t.stringLiteral("react")]
        ),
        t.identifier("lazy")
      ),
      [t.arrowFunctionExpression(
        [], // params
        t.callExpression(t.import(), [t.stringLiteral(path)])
      )]
    )
  );
  return {
    name: "babel-plugin-transform-config",
    visitor: {
      ObjectProperty(path, state) {
        // find the "modules" property of the config object with an array value
        if (
          !path.node.computed &&
          t.isIdentifierOrLiteral(path.node.key, 'modules') &&
          t.isArrayExpression(path.node.value)
        ) {
          const elements = path.get('value.elements'); // get the array elements
          for (const element of elements) {
            // iterate over the objects in the array
            if (!element.isObjectExpression()) {
              continue;
            }
            const properties = element.get('properties');
            const moduleProperty = properties.find(p => (
              !p.node.computed &&
              t.isIdentifierOrLiteral(p.node.key, 'module') &&
              t.isStringLiteral(p.node.value)
            ));
            if (!moduleProperty) {
              continue;
            }
            const moduleName = moduleProperty.node.value.value;
            // find the relative path to the nearest modules/ folder within the project
            const dirname = nodepath.dirname(state.file.opts.filename);
            let { moduleBasePath, defaultModules } = findModulePath(dirname);
            moduleBasePath = moduleBasePath ? nodepath.relative(dirname, moduleBasePath).replace("\\", "/") : "../modules";
            if (defaultModules.indexOf(moduleName) !== -1) {
              moduleBasePath += "/default";
            }
            // resolve the path of the module being requested
            const tryResolvePaths = [
              `${moduleBasePath}/${moduleName}/${moduleName}`, // {moduleName}.jsx?, {moduleName}.tsx?
              `${moduleBasePath}/${moduleName}`, // index.jsx?, index.tsx?, or package.json#main field
            ];
            let absoluteModulePath = resolveModulePath(state.file.opts.filename, tryResolvePaths);
            if (!absoluteModulePath) {
              throw moduleProperty.buildCodeFrameError(
                `Can't resolve module file at any of ${tryResolvePaths.join(", ")}. Make sure a JS or TS file exists at this path.`
              )
            }
            // insert a _path property with the absolute path to the module file
            moduleProperty.insertAfter(
              t.objectProperty(
                t.identifier('_path'),
                t.stringLiteral(absoluteModulePath),
              )
            )
            // insert a _component property with a code-split React.lazy component as its value
            moduleProperty.insertAfter(
              t.objectProperty(
                t.identifier('_component'),
                buildReactLazy(absoluteModulePath),
              )
            );
          }
        }
      },
    },
  };
};

// find the absolute path of the nearest modules/ folder up the tree, or null
const findModulePath = memoize(function (dirName) {
  function findModulePath(dirName) {
    const path = nodepath;
    const actualDirName = path.resolve(dirName);
    const { root } = path.parse(actualDirName);
    // return the nearest .../modules/ path
    const moduleBasePath = path.join(actualDirName, "modules");
    const moduleExists = fs.existsSync(moduleBasePath);
    if (moduleExists) {
      // record which modules are in default/, for if one of these modules is listed
      let defaultModules = [];
      const defaultModulesDir = path.join(moduleBasePath, "default");
      if (fs.existsSync(defaultModulesDir)) {
        defaultModules = fs.readdirSync(defaultModulesDir).filter(f => !f.startsWith("."));
      }
      return { moduleBasePath, defaultModules };
    }
    // stop when we reach the nearest package.json file
    const pkgPath = path.join(actualDirName, "package.json");
    const pkgExists = fs.existsSync(pkgPath);
    if (pkgExists || dirName === root) {
      return {};
    }
    return findModulePath(path.dirname(dirName));
  }
  return findModulePath(dirName);
});

function resolveModulePath(base, paths) {
  for (const tryResolve of paths) {
    try {
      return createRequire(base).resolve(tryResolve);
    } catch (err) {}
  }
  return "";

}