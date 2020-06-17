// This is just the path to the electron binary--spawn another process with it
const electronBin = require("electron");
const execa = require("execa");

/**
 * Runs an electron shell to display the MagicMirror frontend served by a Server object.
 * @param {Object} config MagicMirror config
 * @param {function} cleanup a function to run before quitting
 * @param {Object} options parsed command line options
 */
module.exports = function createWindow(config, { dev = false } = {}) {
  const electronScript = require.resolve("./window-impl");
  const configStr = JSON.stringify(config);
  const optionsStr = JSON.stringify({ dev });

  return {
    open() {
      // pass script, config, and options as command line arguments
      const promise = execa(
        electronBin,
        [electronScript, configStr, optionsStr],
        {
          stdio: "inherit",
        }
      );
      // kill this process in a handler-friendly way
      let onQuit = () => {
        process.kill(process.pid, "SIGINT");
      };
      // end electron if this process is signalled to quit
      process.on("SIGINT", () => {
        onQuit = () => {};
        promise.cancel();
      });
      // end this process if electron quits
      promise.finally(() => onQuit());
    },
  };
};
