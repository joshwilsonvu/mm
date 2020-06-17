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

"use strict";

const transformConfig = require("./transform-config");

module.exports = function (babel) {
  return {
    name: "babel-plugin-transform-config",
    visitor: {
      ObjectExpression(path, state) {
        transformConfig(babel.types, path, state, state.opts);
      },
    },
  };
};
