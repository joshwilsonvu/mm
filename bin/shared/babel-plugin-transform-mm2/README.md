# `babel-plugin-transform-mm2`

![CI status](https://github.com/joshwilsonvu/mm/workflows/CI/badge.svg)
[![npm version](https://img.shields.io/npm/v/@mm/babel-plugin-transform-mm2)](https://yarnpkg.com/package/@mm/babel-plugin-transform-mm2)

This package is a Babel plugin internally used by [`@mm/cli`](../cli).
Please refer to its documentation. You should not normally need to
worry about this package.

Under the hood, this plugin searches for MM2 module files that contain `Module.register({ /* ... */ })`
and transforms them to export React components like other MagicMirror modules. It also patches in synthetic MM2 global
variables, so that there are no real global variables to deal with.

See the [tests](./__tests__/babel-plugin-transform-mm2.test.js) for an example of
the plugin's effect.
