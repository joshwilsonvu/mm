module.exports = {
  testEnvironment: "node",
  verbose: true,
  bail: false,
  testMatch: ["<rootDir>/**/*.test.[jt]s?(x)", "!**/dist/**"],
  watchPathIgnorePatterns: ["__fixtures__"],
  watchPlugins: ["jest-watch-suspend"],
  moduleNameMapper: {
    "\\.css$": "<rootDir>/__tests__/css-stub.js",
  },
  setupFilesAfterEnv: ["<rootDir>/__tests__/global-setup.ts"],
};
