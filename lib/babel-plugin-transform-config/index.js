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
 *   ==> _import: () => import("../modules/[default]/module-name[/module-name]") <==
 *     },
 *     ...
 *   ],
 *   ...
 * }
 */
module.exports = function ({types: t}) {
  t.isIdentifierOrLiteral = (node, name) => t.isIdentifier(node, {name}) || t.isStringLiteral(node, {value: name});
  const buildImport = path => (
    t.objectProperty(
      t.identifier('_import'),
      t.arrowFunctionExpression(
        [], // params
        t.callExpression(
          t.import(),
          [t.stringLiteral(path)]
        )
      )
    )
  );
  return {
    visitor: {
      ObjectProperty(path) {
        // find the "modules" property of the config object with an array value
        if (!path.node.computed && t.isIdentifierOrLiteral(path.node.key, 'modules') && t.isArrayExpression(path.node.value)) {
          const elements = path.get('value.elements'); // get the array elements
          for (const element of elements) {
            // iterate over the objects in the array
            if (element.isObjectExpression()) {
              const properties = element.get('properties');
              for (const property of properties) {
                // find the "module" property of the object
                if (!property.node.computed && t.isIdentifierOrLiteral(property.node.key, 'module') && t.isStringLiteral(property.node.value)) {
                  const moduleName = property.node.value.value; // literal value of property value
                  // insert an _import property with a lazy dynamic import as its value
                  const _import = buildImport(`modules/${moduleName}`);
                  property.insertAfter(_import);
                  break; // don't search through other properties
                }
              }
            }
          }
        }
      }
    }
  };
};