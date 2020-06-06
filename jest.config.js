const path = require("path");
module.exports = {
  testEnvironment: "node",
  verbose: true,
  bail: false,
  testMatch: ["<rootDir>/**/*.test.js"],
  watchPathIgnorePatterns: ["__fixtures__", "MagicMirror"],
  watchPlugins: [
    "jest-watch-suspend",
  ],
  "moduleNameMapper": {
    "\\.css$": "<rootDir>/__tests__/css-stub.js",
  },
  "preset": "ts-jest/presets/js-with-babel",
  "globals": {
    "ts-jest": {
      "tsConfig": path.resolve(__dirname, "tsconfig.base.json"),
      "packageJson": path.resolve(__dirname, "package.json"),
    }
  }
};