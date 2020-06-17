/**
 * @jest-environment jsdom
 */

const { Module, Escape } = require("../src");

const React = require("react");
const { render, screen } = require("@testing-library/react");
const matchers = require("@testing-library/jest-dom/matchers");
expect.extend(matchers);

test("Module", () => {
  const Component = Module.register("Test", {});
});

test("Escape", () => {
  // create a few DOM nodes
  function createDomNodes(text) {
    let div = document.createElement("div");
    let p = document.createElement("p");
    p.append(text);
    div.appendChild(p);
    return div;
  }

  // render the DOM nodes using Escape
  const text1 = "Result of Module#getDOM()";
  const { rerender, unmount } = render(
    React.createElement(Escape, { dom: createDomNodes(text1) })
  );
  expect(screen.getByText(text1)).toBeInTheDocument();

  // rerender with different DOM nodes
  const text2 = "Some other text";
  rerender(React.createElement(Escape, { dom: createDomNodes(text2) }));
  expect(screen.getByText(text2)).toBeInTheDocument();
  expect(screen.queryByText(text1)).toBe(null);

  // unmount and make sure the DOM nodes are gone
  unmount();
  expect(screen.queryByText(text2)).toBe(null);
});
