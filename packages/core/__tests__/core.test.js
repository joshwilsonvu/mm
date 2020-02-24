'use strict';

const core = require('../lib/index');
const React = require("react");
// const {render, fireEvent, screen} = require('@testing-library/react');

test('core components', () => {
  const {MagicMirror, ModuleGuard} = core;
  expect(React.isValidElement(<MagicMirror/>)).toBeTruthy();
  expect(React.isValidElement(<ModuleGuard/>)).toBeTruthy();
})
