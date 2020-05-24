/*
 * This file is a bare-bones shell for the client to run
 */

import electron from "electron";
// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, MenuItem} = electron;

module.exports = async function Window(config, cleanup, options) {
  await app.whenReady();

  // Create the browser window.
  let window = new BrowserWindow({
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    darkTheme: true,
    backgroundColor: "#000",
    ...(process.env.NODE_ENV === "production" ? { fullscreen: true, autoHideMenuBar: true, 	titleBarStyle: "hidden" } : {}),
    ...config.electronOptions, // override from config
    webPreferences: {
      nodeIntegration: false,
      zoomFactor: config.zoom,
      autoplayPolicy: "no-user-gesture-required",
      ...(config.electronOptions && config.electronOptions.webPreferences),
    },
  });

  // and load the index.html of the app.
  window.loadURL(``);

  // Open the DevTools if run with "npm start dev"
  if (options.dev) {
	  window.webContents.openDevTools();
  }

  if (config.kioskmode) {
    window.on("blur", () => {
      window.focus();
    });

    window.on("leave-full-screen", () => {
      window.setFullScreen(true);
    });
  }

  // Quit when all windows are closed.
  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("before-quit", event => {
    if (typeof cleanup === "function") {
      event.preventDefault();
      setTimeout(() => process.exit(0), 3000);
      try {
        cleanup();
      } catch {
        process.exit(0);
      }
    }
  });

  const menu = new Menu();
  menu.append(new MenuItem({
    label: "Quit",
    accelerator: "CmdOrCtrl+Q",
    click: () => app.quit()
  }));

  // The next part is here to prevent a major exception when there
  // is no internet connection. This could probable be solved better.
  process.on("uncaughtException", err => {
    console.log("Whoops! There was an uncaught exception...");
    console.error(err);
    app.quit();
    // console.log("MagicMirror will not quit, but it might be a good idea to check why this happened. Maybe no internet connection?");
    // console.log("If you think this really is an issue, please open an issue on GitHub: https://github.com/MichMich/MagicMirror/issues");
  });

  return function stop() {
    app.quit();
  }
}

