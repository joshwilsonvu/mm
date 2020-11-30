/**
 * @jest-environment jsdom
 */
import { Module } from "./mm2";
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
  const props: React.ComponentPropsWithoutRef<typeof Component> = {
    name: "helloworld",
    hidden: false,
    identifier: "asdfghjkl",
    path: "helloworld/helloworld.js",
    classes: [],
    config: {},
    disabled: false,
    header: null,
    position: "top_left",
  };
  expect(React.isValidElement(<Component {...props} />)).toBe(true);
});
