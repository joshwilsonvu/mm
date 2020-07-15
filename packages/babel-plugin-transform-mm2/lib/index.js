"use strict";

const {
  transformModuleDotRegister,
  transformRequireNodeHelper,
} = require("./transform-mm2");

module.exports = function (babel) {
  return {
    name: "babel-plugin-transform-mm2",
    visitor: {
      ExpressionStatement(path, state) {
        transformModuleDotRegister(babel.types, path, state, state.opts);
      },
      CallExpression(path, state) {
        transformRequireNodeHelper(babel.types, path, state, state.opts);
      },
    },
  };
};
