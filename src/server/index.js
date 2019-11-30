/*
 * This file is a bare-bones shell for the client to run
 */

import electron from "electron";
import config from "../shared/config";
import core from "./core";
// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, MenuItem} = electron;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
  if (mainWindow) {
	return;
  }
  // Create the browser window.
  mainWindow = new BrowserWindow({
	width: 800,
	height: 600,
	x: 0,
	y: 0,
	darkTheme: true,
	webPreferences: {
	  nodeIntegration: false,
	  zoomFactor: config.zoom
	},
	backgroundColor: "#000",
	...(process.env.NODE_ENV === "production" ? { fullscreen: true, autoHideMenuBar: true, 	titleBarStyle: "hidden" } : {}),
	...config.electronOptions
  });

  if (process.env.NODE_ENV === "production") {
	mainWindow.loadFile(config.root_path);
  }
  // and load the index.html of the app.
  mainWindow.loadURL("http://localhost:3000");

  // Open the DevTools if run with "npm start dev"
  if (process.argv.includes("dev")) {
	mainWindow.webContents.openDevTools();
  }

  if (config.kioskmode) {
	mainWindow.on("blur", function () {
	  mainWindow.focus();
	});

	mainWindow.on("leave-full-screen", function () {
	  mainWindow.setFullScreen(true);
	});

	mainWindow.on("resize", function () {
	  setTimeout(function () {
		mainWindow.reload();
	  }, 1000);
	});
  }

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
	// Dereference the window object, usually you would store windows
	// in an array if your app supports multi windows, this is the time
	// when you should delete the corresponding element.
	mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
	app.quit();
  }
});

app.on("activate", function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
	createWindow();
  }
});

app.on("before-quit", event => {
  event.preventDefault();
  setTimeout(() => process.exit(0), 3000);
  try {
	core.stop();
  } catch {
	process.exit(0);
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