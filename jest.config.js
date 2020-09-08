module.exports = {
  testEnvironment: "node",
  verbose: true,
  bail: false,
  testMatch: ["<rootDir>/**/__tests__/**/*.test.[jt]s?(x)"],
  watchPathIgnorePatterns: ["__fixtures__", "MagicMirror"],
  watchPlugins: ["jest-watch-suspend"],
  moduleNameMapper: {
    "\\.css$": "<rootDir>/__tests__/css-stub.js",
  },
  setupFilesAfterEnv: ["<rootDir>/__tests__/global-setup.ts"],
};
