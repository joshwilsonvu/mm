
const fs = require('fs');
const path = require("path");
const core = require('..');
const React = require("react");
// const {render, fireEvent, screen} = require('@testing-library/react');

test('core components', () => {
  const {MagicMirror, ModuleGuard} = core;
  expect(React.isValidElement(<MagicMirror/>)).toBe(true);
  expect(React.isValidElement(<ModuleGuard/>)).toBe(true);
})

test('css is distributed', () => {
  expect(fs.existsSync(path.resolve(__dirname, "..", "css", "index.css"))).toBe(true);
})