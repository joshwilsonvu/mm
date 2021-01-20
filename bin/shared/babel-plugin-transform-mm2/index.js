"use strict";

module.exports = function (babel) {
  return {
    name: "babel-plugin-transform-mm2",
    inherits: require("@babel/plugin-syntax-jsx").default,
    visitor: {
      ExpressionStatement(path, state) {
        transformModuleDotRegister(babel.types, path, state);
      },
    },
  };
};

/*
 * This Babel plugin imports Module, etc. from "@mm/mm2" and exports the result
 * of Module.register, only in MM2-style modules.
 */
function transformModuleDotRegister(t, path /* ExpressionStatement */, state) {
  // if this is "Module.register()", replace with "export default Module.register()"
}
