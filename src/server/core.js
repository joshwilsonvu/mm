import fs from "fs";
import path from "path";
//import Server from "./server";
import util from "./utils";
import defaultModules from "../../modules/default/defaultmodules";
import config from "../shared/config";


//
// const tryImport = async (path, onFail) => {
//   try {
// 	return await import(path);
//   } catch (e) {
// 	if (onFail) {
// 	  return onFail(e);
// 	}
//   }
// };
//
// class App {
//   constructor() {
// 	this.nodeHelpers = [];
//   }
//
//   /* loadModule(module)
//    * Loads a specific module.
//    *
//    * argument module string - The name of the module (including subpath).
//    */
//   async loadModule(module) {
// 	const elements = module.split("/");
// 	const moduleName = elements[elements.length - 1];
// 	let moduleFolder = path.join(__dirname, "..", "modules", module);
//
// 	if (defaultModules.indexOf(moduleName) !== -1) {
// 	  moduleFolder = path.join(__dirname, "..", "modules", "default", module);
// 	}
//
// 	const helperPath = path.join(moduleFolder, "node_helper");
//
// 	const Module = await tryImport(helperPath, err => {
// 	  console.log(`No helper found for module: ${moduleName}.`);
// 	});
// 	if (Module) {
// 	  const m = new Module();
// 	  if (m.requiresVersion) {
// 		console.log(`Check MagicMirror version for node helper '${moduleName}' - Minimum version: ${m.requiresVersion} - Current version: ${config.version}`);
// 		if (cmpVersions(config.version, m.requiresVersion) >= 0) {
// 		  console.log("Version is ok!");
// 		} else {
// 		  console.log(`Version is incorrect. Skip module: '${moduleName}'`);
// 		  return;
// 		}
// 	  }
//
// 	  m.setName(moduleName);
// 	  m.setPath(path.resolve(moduleFolder));
// 	  this.nodeHelpers.push(m);
//
// 	  return new Promise(res => m.loaded(res));
// 	}
//   }
//
//   async loadModules(modules) {
// 	await Promise.all(modules.map(m => this.loadModule(m)));
// 	console.log("All module helpers loaded.");
//   }
// }

class App {
  start() {}
  stop() {}
}



export default new App();