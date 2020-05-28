
const electron = require("electron");
// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, MenuItem} = electron;

app.on("ready", () => {
  // get config and command line options from main process
  const config = JSON.parse(process.argv[2]), options = JSON.parse(process.argv[3]);

  // Create the browser window.
  let window = new BrowserWindow({
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    darkTheme: true,
    backgroundColor: "#000",
    ...(!options.dev ? { fullscreen: true, autoHideMenuBar: true, titleBarStyle: "hidden" } : {}),
    ...config.electronOptions, // override from config
    webPreferences: {
      nodeIntegration: false,
      zoomFactor: config.zoom,
      autoplayPolicy: "no-user-gesture-required",
      ...(config.electronOptions && config.electronOptions.webPreferences),
    },
  });

  // and load the index.html of the app.
  window.loadURL(config.url);

  // Open the DevTools if run with "npm start dev"
  if (options.dev) {
    window.webContents.openDevTools();
  }

  // Quit when all windows are closed.
  app.on("window-all-closed", () => {
    app.quit();
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

  process.on("SIGINT", () => app.quit());
});
