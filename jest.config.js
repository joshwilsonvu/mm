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
    "\\.css$": "<rootDir>/__tests__/css-stub.js"
  }
  //projects: ["packages/*"]
  //transform: { "^.+\\.jsx?$": "babel-jest" },
  // moduleFileExtensions: ["js", "jsx"],
};