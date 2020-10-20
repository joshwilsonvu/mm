/**
 * @jest-environment jsdom
 */
import { Module } from ".";
import React from "react";

const mm2Definition = () => ({
  // Default module config.
  defaults: {
    text: "Hello World!",
  },

  start: jest.fn(),
  // Override dom generator.
  getDom: jest.fn(function (this: any) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = this.config.text;
    return wrapper;
  }),
});

test("Module basically works", () => {
  const Component = Module.register("helloworld", mm2Definition());
  expect(React.isValidElement(<Component />)).toBe(true);
});
