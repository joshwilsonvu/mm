// Readline lets us tap into the process events
const readline = require("readline");
const Emitter = require("mitt");

module.exports = function keypress() {
  let handlers = Emitter();

  function onKeypress(str, key) {
    // Handle Ctrl+C to quit by sending SIGINT signal to this process
    if (key.sequence === "\u0003") {
      process.kill(process.pid, "SIGINT");
      return;
    }
    // User has triggered a keypress, now do whatever we want!
    handlers.emit(key.sequence);
  }

  if (process.stdin.isTTY) {
    if (!process.stdin.rawMode) {
      // Allows us to listen for events from stdin
      readline.emitKeypressEvents(process.stdin);

      // Raw mode gets rid of standard keypress events and other
      // functionality Node.js adds by default
      process.stdin.setRawMode(true);
    }
    process.stdin.on("keypress", onKeypress);
  }
  return {
    on(sequence, handler) {
      handlers.on(sequence, handler);
    },
    off(sequence, handler) {
      handlers.off(sequence, handler);
    },
    done() {
      process.stdin.off("keypress", onKeypress);
      process.stdin.setRawMode(false);
    },
  };
};
