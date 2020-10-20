/**
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

const nodepath = require("path");
const fs = require("fs");
const memoize = require("fast-memoize");
const { createRequire } = require("module");

module.exports = function babelPluginTransformConfig(babel) {
  return {
    name: "babel-plugin-transform-config",
    visitor: {
      ObjectExpression(path, state) {
        transformConfig(babel.types, path, state, state.opts);
      },
    },
  };
};

function transformConfig(t, path /* ObjectExpression */, state, options) {
  // find the { modules: any[] } property
  const modulesProperty = path.get("properties").find((property) => {
    return (
      !property.node.computed &&
      isIdentifierOrLiteral(property.get("key"), "modules") &&
      property.get("value").isArrayExpression()
    );
  });
  if (modulesProperty) {
    transformModulesProperty(t, modulesProperty, state, options);
  }
}

function transformModulesProperty(t, path, state, options) {
  // get the array elements
  const elements = path.get("value.elements");
  for (const element of elements) {
    // iterate over the objects in the array
    if (!element.isObjectExpression()) {
      continue;
    }
    const properties = element.get("properties");
    // bail if the object has { disabled: true }
    if (
      properties.find(
        (p) =>
          !p.node.computed &&
          isIdentifierOrLiteral(p.get("key"), "disabled") &&
          t.isBooleanLiteral(p.node.value, {
            value: true,
          })
      )
    ) {
      continue;
    }
    // get the "module" property
    const moduleProperty = properties.find(
      (p) =>
        !p.node.computed &&
        isIdentifierOrLiteral(p.get("key"), "module") &&
        t.isStringLiteral(p.node.value)
    );
    if (!moduleProperty) {
      continue;
    }
    const moduleName = moduleProperty.node.value.value;
    if (moduleName !== encodeURIComponent(moduleName)) {
      // name is not safe for a URI, syntax error and suggest a conservative character set
      throw moduleProperty.buildCodeFrameError(
        `'${moduleName}' is not safe for URIs. Please use only the following characters: A-Z a-z 0-9 - _`
      );
    }
    // find the relative path to the nearest modules/ folder within the project
    let modulesPath;
    modulesPath = nodepath.resolve(
      state.file.opts.filename,
      options.modulesPath.replace("/", nodepath.sep)
    );
    const defaultModules = findDefaultModules(modulesPath);
    if (defaultModules.indexOf(moduleName) !== -1) {
      modulesPath = nodepath.join(modulesPath, "default");
    }

    // resolve the path of the module being requested
    const tryResolvePaths = [
      nodepath.join(modulesPath, moduleName), // index.jsx?, index.tsx?, or package.json#main field
      nodepath.join(modulesPath, moduleName, moduleName), // {moduleName}.jsx?, {moduleName}.tsx?
    ];
    const resolvedModulePath = resolveModulePath(
      state.file.opts.filename,
      tryResolvePaths
    );
    if (!resolvedModulePath) {
      throw moduleProperty.buildCodeFrameError(
        `Can't resolve module file at any of ${tryResolvePaths.join(
          ", "
        )}. Make sure a ${Object.keys(require.extensions).join(
          "|"
        )} file exists at this path.`
      );
    }
    // insert a _path property with the absolute path to the module file
    moduleProperty.insertAfter(
      t.objectProperty(
        t.identifier("_path"),
        t.stringLiteral(resolvedModulePath)
      )
    );

    // resolve the path to the node helper file of the module, if any
    const resolvedHelperPath = resolveModulePath(state.file.opts.filename, [
      nodepath.join(modulesPath, "node_helper"),
      nodepath.join(modulesPath, "node-helper"),
    ]);
    // insert a _helperPath property with the absolute path to the helper file
    if (resolvedHelperPath) {
      moduleProperty.insertAfter(
        t.objectProperty(
          t.identifier("_helperPath"),
          t.stringLiteral(resolvedHelperPath)
        )
      );
    }
  }
}

const findDefaultModules = memoize(function (modulesPath) {
  // record which modules are in default/, for if one of these modules is listed
  let defaultModules = [];
  const defaultModulesDir = nodepath.join(modulesPath, "default");
  if (fs.existsSync(defaultModulesDir)) {
    defaultModules = fs
      .readdirSync(defaultModulesDir)
      .filter((f) => !f.startsWith("."));
  }
  return defaultModules;
});

function resolveModulePath(base, paths) {
  for (const tryResolve of paths) {
    try {
      return createRequire(base).resolve(tryResolve.replace("\\", "/"));
    } catch (err) {}
  }
}

function isIdentifierOrLiteral(path, name) {
  return path.isIdentifier({ name }) || path.isStringLiteral({ value: name });
}
