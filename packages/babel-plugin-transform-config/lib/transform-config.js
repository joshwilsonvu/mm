const nodepath = require("path");
const fs = require("fs");
const memoize = require("fast-memoize");
const { createRequire } = require("module");
const homeDir = nodepath.resolve(require("os").homedir())

module.exports = function transformConfig(t, path /* ObjectExpression */, state, options) {
  // find the { modules: any[] } property
  const modulesProperty = path.get("properties").find(property => {
    return !property.node.computed
    && isIdentifierOrLiteral(property.get('key'), 'modules')
    && property.get('value').isArrayExpression()
  });
  if (modulesProperty) {
    transformModulesProperty(t, modulesProperty, state, options);
  }
}

function transformModulesProperty(t, path, state, options) {
  // get the array elements
  const elements = path.get('value.elements');
  for (const element of elements) {
    // iterate over the objects in the array
    if (!element.isObjectExpression()) {
      continue;
    }
    const properties = element.get('properties');
    const moduleProperty = properties.find(p => (
      !p.node.computed &&
      isIdentifierOrLiteral(p.get('key'), 'module') &&
      t.isStringLiteral(p.node.value)
    ));
    if (!moduleProperty) {
      continue;
    }
    const moduleName = moduleProperty.node.value.value;
    // find the relative path to the nearest modules/ folder within the project
    let modulesPath;
    if (typeof options.modulesPath === "string") {
      modulesPath = nodepath.resolve(state.file.opts.filename, options.modulesPath.replace("/", nodepath.sep))
    } else {
      const dirname = nodepath.dirname(state.file.opts.filename);
      modulesPath = findModulesPath(dirname);
    }
    const defaultModules = findDefaultModules(modulesPath);
    if (defaultModules.indexOf(moduleName) !== -1) {
      modulesPath = nodepath.join(modulesPath, "default");
    }
    // resolve the path of the module being requested
    const tryResolvePaths = [
      nodepath.join(modulesPath, moduleName, moduleName), // {moduleName}.jsx?, {moduleName}.tsx?
      nodepath.join(modulesPath, moduleName), // index.jsx?, index.tsx?, or package.json#main field
    ];
    let absoluteModulesPath = resolveModulesPath(state.file.opts.filename, tryResolvePaths, errMsg => {
      throw moduleProperty.buildCodeFrameError(errMsg);
    });
    // insert a _path property with the absolute path to the module file
    moduleProperty.insertAfter(
      t.objectProperty(
        t.identifier('_path'),
        t.stringLiteral(absoluteModulesPath),
      )
    )
    // insert a _component property with a code-split React.lazy component as its value
    moduleProperty.insertAfter(
      t.objectProperty(
        t.identifier('_component'),
        buildReactLazy(t, absoluteModulesPath, moduleName),
      )
    );
  }
}

function buildReactLazy(t, path, name) {
  const pathLiteral = t.stringLiteral(path);
  // use magic webpack comments to name the chunk and preload the bundle
  // https://webpack.js.org/api/module-methods/#magic-comments
  pathLiteral.leadingComments = [` webpackChunkName: "${name}" `, " webpackPreload: true "]
    .map(value => ({ type: "CommentBlock", value }));
  return (
    // require("react").lazy(() => import("<path>"))
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
        t.callExpression(t.import(), [pathLiteral])
      )]
    )
  );
}

// find the absolute path of the nearest modules/ folder up the tree, or null
const findModulesPath = memoize(function (dirName) {
  const path = nodepath;
  function findModulesPath(dirName) {
    const actualDirName = path.resolve(dirName);
    // return the nearest .../modules/ path
    const modulesPath = path.join(actualDirName, "modules");
    const moduleExists = fs.existsSync(modulesPath);
    if (moduleExists) {
      return modulesPath;
    }
    // stop when we reach the nearest package.json file or the home directory
    const pkgPath = path.join(actualDirName, "package.json");
    const pkgExists = fs.existsSync(pkgPath);
    if (pkgExists || dirName === homeDir) {
      return "";
    }
    return findModulesPath(path.dirname(dirName));
  }
  return findModulesPath(dirName);
});

const findDefaultModules = memoize(function (modulesPath) {
  // record which modules are in default/, for if one of these modules is listed
  let defaultModules = [];
  const defaultModulesDir = nodepath.join(modulesPath, "default");
  if (fs.existsSync(defaultModulesDir)) {
    defaultModules = fs.readdirSync(defaultModulesDir).filter(f => !f.startsWith("."));
  }
  return defaultModules;
})

function resolveModulesPath(base, paths, onError) {
  for (const tryResolve of paths) {
    try {
      return createRequire(base).resolve(tryResolve.replace("\\", "/"));
    } catch (err) { }
  }
  onError(`Can't resolve module file at any of ${paths.join(", ")}.
Make sure a ${Object.keys(require.extensions).join("|")} file exists at this path.`)
}

function isIdentifierOrLiteral(path, name) {
  return path.isIdentifier({ name }) || path.isStringLiteral({ value: name });
}
