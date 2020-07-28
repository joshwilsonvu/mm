/**
 * @jest-environment jsdom
 */
import { Module } from "../src";
import React from "react";
import { render, screen as tlScreen } from "@testing-library/react";

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
  const Component = Module.register("helloworld", mm2Definition()) as any;
  expect(React.isValidElement(<Component />)).toBe(true);
});
