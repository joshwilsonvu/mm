const { Console } = require("console");
const stream = require("stream");

module.exports = function mockConsole() {
  const mockStdout = new MockStdout();
  const mockConsole = new Console(mockStdout);
  mockConsole.output = function(...args) {
    return mockStdout.output(...args);
  }

  const originalConsole = global.console;
  global.console = mockConsole;
  return () => {
    global.console = originalConsole;
  };
}

class MockStdout extends stream.Writable {
  writes = [];

  _write(chunk, encoding, callback) {
    let err;
    try {
      writes.push(typeof chunk === "string" ? chunk : chunk.toString(encoding || "utf8"));
    } catch (e) {
      err = e;
    }
    callback(err);
  }

  _final(callback) {
    callback();
  }

  output(...transforms) {
    let all = writes.join("");
    return transforms.reduce((str, transform) => transform(str), all);
  }
}