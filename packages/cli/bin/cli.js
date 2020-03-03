'use strict';

const cli = require('..');

// The next part is here to prevent a major exception when there
// is no internet connection. This could probable be solved better.
process.on("uncaughtException", err => {
	console.log("Whoops! There was an uncaught exception...");
	console.error(err);
	console.log("MagicMirror will not quit, but it might be a good idea to check why this happened. Maybe no internet connection?");
	console.log("If you think this really is an issue, please open an issue on GitHub: https://github.com/MichMich/MagicMirror/issues");
});

// run the comand line tool
cli(process.argv);