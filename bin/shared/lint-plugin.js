/**
 * Runs ESLint on source files
 */
module.exports = function snowpackPluginTransform(
  snowpackConfig,
  pluginOptions
) {
  const { ESLint } = require("eslint");
  const paths = require("../shared/paths");

  const eslint = new ESLint({
    baseConfig: require("./eslint-config"),
    reportUnusedDisableDirectives: "warn",
    useEslintrc: false,
    resolvePluginsRelativeTo: require.resolve("./eslint-config"),
  });

  let onFileChange = null;
  let onCleanup = null;

  return {
    name: "snowpack-plugin-eslint",
    // Lint files
    async run({ isDev, log }) {
      const formatter = await eslint.loadFormatter(
        require.resolve("./eslint-formatter")
      );

      if (isDev) {
        onFileChange = async (filePath) => {
          if (!(await eslint.isPathIgnored(filePath))) {
            const results = await eslint.lintFiles(filePath);
            const msg = formatter.format(results);
            log("WORKER_MSG", { level: "log", msg });
          }
        };
      }

      await eslint.lintFiles([paths.src, paths.modules, paths.config]);

      return new Promise((resolve) => {
        onCleanup = resolve;
      });
    },
    onChange({ filePath }) {
      onFileChange && onFileChange(filePath);
    },
    cleanup() {
      onFileChange = null;
      onCleanup && onCleanup();
    },
  };
};
