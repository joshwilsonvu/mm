module.exports = {
  root: true,
  extends: require.resolve("./bin/shared/eslint-config"),
  ignorePatterns: [
  "dist/",
  "build/",
  "node_modules/",
  ".pnp*"
  ],
  rules: {
    strict: "off"
  }
}
