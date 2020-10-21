const { transformFileAsync } = require("@babel/core");
const path = require("path");
const paths = require("../shared/paths");

const babelOpts = {
  caller: {
    name: "snowpack-plugin-transform",
    supportsStaticESM: true,
  },
  cloneInputAst: false,
  configFile: false,
  babelrc: false,
};

// Allow parsing of TypeScript files but don't transform
const syntaxTypescript = [
  require.resolve("@babel/plugin-syntax-typescript"),
  { isTSX: true },
];

const babelOptsCfg = {
  ...babelOpts,
  plugins: [
    [
      require.resolve("./babel-plugin-transform-config"),
      { modulesPath: paths.modules },
    ],
  ],
};

/**
 * Runs Babel on MM2 module files only, to make them compatible with the new API.
 */
module.exports = function snowpackPluginTransform(
  snowpackConfig,
  pluginOptions
) {
  return {
    name: "snowpack-plugin-transform",
    resolve: {
      input: paths.extensions,
      output: paths.extensions,
    },
    // Transform specific user files with Babel
    async load({ filePath, fileExt }) {
      filePath = path.resolve(filePath);
      if (isMM2Module(filePath)) {
        const { code, map } = await transformFileAsync(filePath, {
          ...babelOpts,
          plugins: [
            fileExt.includes(".ts") && syntaxTypescript,
            require.resolve("./babel-plugin-transform-mm2"),
          ].filter(Boolean),
        });
        return {
          [fileExt]: {
            code,
            map,
          },
        };
      } else if (isConfig(filePath)) {
        const { code, map } = await transformFileAsync(filePath, {
          ...babelOpts,
          plugins: [
            fileExt.includes(".ts") && syntaxTypescript,
            [
              require.resolve("./babel-plugin-transform-config"),
              { modulesPath: paths.modules },
            ],
          ].filter(Boolean),
        });
        return {
          [fileExt]: {
            code,
            map,
          },
        };
      }
      // defer other files to esbuild
      console.log("Deferring file", filePath);
    },
  };
};

// MM2 module entry files take the form {paths.modules}/.../module-name/module-name.js
function isMM2Module(filePath) {
  if (!contains(paths.modules, filePath)) {
    return false;
  }
  const basename = path.basename(filePath, ".js");
  const dirname = path.basename(path.dirname(filePath));
  return basename === dirname;
}

function isConfig(filePath) {
  return contains(paths.config, filePath);
}

function contains(parent, child) {
  if (parent === child) return true;
  const relative = path.relative(parent, child);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}
