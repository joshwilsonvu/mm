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
 *   ==> _import: () => import("modules/module-name") <==
 *     },
 *     ...
 *   ],
 *   ...
 * }
 */

const nodepath = require("path");
const fs = require("fs");
const memoize = require("memoize-one");
module.exports = function(babel) {
  const t = babel.types;
  t.isIdentifierOrLiteral = (node, name) =>
    t.isIdentifier(node, { name }) || t.isStringLiteral(node, { value: name });
  const buildImport = path =>
    t.objectProperty(
      t.identifier('_import'),
      t.arrowFunctionExpression(
        [], // params
        t.callExpression(t.import(), [t.stringLiteral(path)])
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
            if (element.isObjectExpression()) {
              const properties = element.get('properties');
              for (const property of properties) {
                // find the "module" property of the object
                if (
                  !property.node.computed &&
                  t.isIdentifierOrLiteral(property.node.key, 'module') &&
                  t.isStringLiteral(property.node.value)
                ) {
                  const moduleName = property.node.value.value;
                  // find the relative path to the nearest modules/ folder within the project
                  const dirname = nodepath.dirname(state.file.opts.filename);
                  let moduleBasePath = findModulePath(dirname);
                  moduleBasePath = moduleBasePath ? nodepath.relative(dirname, moduleBasePath).replace("\\", "/"): "modules";
                  // add the path of the module being requested
                  const modulePath = `${moduleBasePath}/${defaultModules.indexOf(moduleName) !== -1 ? 'default/' : ''}${moduleName}/${moduleName}`;
                  // insert an _import property with a lazy dynamic import as its value
                  const _import = buildImport(modulePath);
                  property.insertAfter(_import);
                  break; // don't search through other properties
                }
              }
            }
          }
        }
      },
    },
  };
};

// preface default/ if one of these modules is listed
const defaultModules = [
  'alert',
  'calendar',
  'clock',
  'compliments',
  'currentweather',
  'helloworld',
  'newsfeed',
  'weatherforecast',
  'updatenotification',
  'weather',
];

// find the absolute path of the nearest modules/ folder up the tree, or null
const findModulePath = memoize(function(dirName) {
  function findModulePath(dirName) {
    const path = nodepath;
    const actualDirName = path.resolve(dirName);
    const {root} = path.parse(actualDirName);
    // return the nearest .../modules/ path
    const modulePath = path.join(actualDirName, "modules");
    const moduleExists = fs.existsSync(modulePath);
    if (moduleExists) {
      return modulePath;
    }
    // stop when we reach the nearest package.json file
    const pkgPath = path.join(actualDirName, "package.json");
    const pkgExists = fs.existsSync(pkgPath);
    if (pkgExists || dirName === root) {
      return null;
    }
    return findModulePath(path.dirname(dirName));
  }
  return findModulePath(dirName);
});