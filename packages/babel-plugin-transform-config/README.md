# `babel-plugin-transform-config`

![CI status](https://github.com/joshwilsonvu/mm/workflows/CI/badge.svg)
[![npm version](https://img.shields.io/npm/v/@mm/babel-plugin-transform-config)](https://yarnpkg.com/package/@mm/babel-plugin-transform-config)

This package is a Babel plugin internally used by [`@mm/cli`](../cli).
Please refer to its documentation. You should not normally need to
worry about this package.

Under the hood, this Babel plugin adds special properties to the config object
that help `@mm/cli` resolve the location of the modules on disk.

See the [tests](./__tests__/babel-plugin-transform-config.test.js) for an example of
the plugin's effect.

### Usage with `@mm/cli`

It's already set up to transform the config file at `MagicMirror/config/config.*`.
Use the environment variable `MM_CONFIG_FILE` to override the default location.

### Usage with `babel-plugin-macros` (enabled by default in `@mm/cli` and `create-react-app`)

```javascript
import transformConfig from "@mm/babel-plugin-transform-config/macro";

const config = transformConfig({
  modules: [
    {
      module: "a-module",
    }
  ]
}, {
  modulesPath: "../../modules"
})

      ↓ ↓ ↓ ↓ ↓ ↓

const config = {
  modules: [
    {
      module: "a-module",
      // adds special properties resolving the location of the modules on disk
    }
  ]
}