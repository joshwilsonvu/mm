/**
 * @jest-environment jsdom
 */

const { Module, Escape } = require("../src");

const React = require("react");
const { render, screen } = require("@testing-library/react");
const matchers = require("@testing-library/jest-dom/matchers");
expect.extend(matchers);

test("Module", () => {
  const Component = Module.register("helloworld", {
    // Default module config.
    defaults: {
      text: "Hello World!",
    },

    // Override dom generator.
    getDom: function () {
      var wrapper = document.createElement("div");
      wrapper.innerHTML = this.config.text;
      return wrapper;
    },
  });
  expect(React.isValidElement(<Component />)).toBe(true);

  render(<Component name="helloworld" config={{}} />);
  expect(screen.getByText("Hello World!")).toBeInTheDocument();
});
