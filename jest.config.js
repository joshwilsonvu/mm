module.exports = {
  testEnvironment: "node",
  verbose: true,
  bail: false,
  testMatch: ["<rootDir>/**/*.test.js"],
  watchPathIgnorePatterns: ["__fixtures__"],
  watchPlugins: [
    "jest-watch-suspend",
  ]
  //projects: ["packages/*"]
  //transform: { "^.+\\.jsx?$": "babel-jest" },
  // moduleFileExtensions: ["js", "jsx"],
};