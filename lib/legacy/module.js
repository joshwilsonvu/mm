/**
 * This Module class is provided only for backwards compatibility with
 * existing MagicMirror plugins. These plugins will subclass this class,
 * and the resulting instance will be wrapped in a React component.
 */
import {Environment, WebLoader} from "nunjucks";
import path from "path";

const nunjucksMap = new WeakMap();
const getNunjucksEnvironment = module => {
  let env = nunjucksMap.get(module);
  if (env) {
    return env;
  }
  env = new Environment(new WebLoader(module.file(""), {async: true}), {
    trimBlocks: true,
    lstripBlocks: true
  });
  env.addFilter("translate", str => module.translate(str));
  nunjucksMap.set(module, env);
  return env;
};

const socketMap = new WeakMap();
/*const getSocket = module => {
  let socket = socketMap.get(module);
  if (!socket) {
    socket = new MMSocket(module.name);
    socket.setNotificationCallback((n, p) => module.socketNotificationReceived(n, p));
    socketMap.set(module, socket);
  }
  return socket;
};*/

export default class Module {
  constructor(data) {
    this.data = data;
    this.name = data.name || "";
    this.identifier = data.identifier || "";
    this.hidden = false;
    this.setConfig(data.config || {});
  }

  /* All methods (and properties below can be overridden. */

  // Set the minimum MagicMirror module version for this module.
  requiresVersion = "2.0.0";

  // Module config defaults.
  defaults = {};

  // The name of the module.
  name = "";

  // Called when the module is instantiated (compat).
  init() {
  }

  // Called when the module is started (compat).
  start() {
    console.info(`Starting module: ${this.name}`);
  }

  // Returns a list of scripts the module requires to be loaded (compat).
  getScripts() {
    return [];
  }

  // Returns a list of stylesheets the module requires to be loaded (compat).
  getStyles() {
    return [];
  }

  // Returns a map of translation files the module requires to be loaded.
  getTranslations() {
    return false;
  }

  // This method generates the dom which needs to be displayed (compat).
  // Use one of getDom() or getTemplate() if not using React.
  async getDom() {
    let div = document.createElement("div");
    let template = this.getTemplate();
    let templateData = this.getTemplateData();

    if (/^.*((\.html)|(\.njk))$/.test(template)) {
      // the template is a filename
      return new Promise((resolve, reject) => {
        getNunjucksEnvironment(this).render(template, templateData, (err, res) => {
          if (err) {
            console.error(err);
            reject(err);
          } else {
            div.innerHTML = res;
            resolve(div);
          }
        });
      });
    } else {
      // the template is a template string.
      div.innerHTML = getNunjucksEnvironment(this).renderString(template, templateData);
      return div;
    }
  }

  // Generates the header string to be displayed if a user has a header configured for this module.
  getHeader() {
    return this.data.header;
  }

  // Returns the template for the default getDom() implementation.
  getTemplate() {
    return `<div class="normal">${this.name}</div><div class="small dimmed">${this.identifier}</div>`;
  }

  // Returns the data to be used in the template.
  getTemplateData() {
    return {};
  }

  // Called when a notification arrives, by the Magic Mirror core.
  notificationReceived(notification, payload, sender) {
    if (sender) {
      console.log(`${this.name} received a module notification: ${notification} from sender: ${sender.name}`);
    } else {
      console.log(`${this.name} received a system notification: ${notification}`);
    }
  }

  // Called when a socket notification arrives.
  socketNotificationReceived(notification, payload) {
    console.log(`${this.name} received a socket notification: ${notification} - Payload: ${payload}`);
  }

  // Called when a module is hidden.
  suspend() {
    console.log(`${this.name} is suspended.`);
  }

  // Called when a module is shown.
  resume() {
    console.log(`${this.name} is resumed.`);
  }

  // Set the module config and combine it with the module defaults.
  setConfig(config) {
    this.config = {...this.defaults, ...config};
  }

  // Returns a socket object. If it doesn't exist, it's created.
  // It also registers the notification callback.
  // socket() {
  //   return getSocket(this);
  // }

  // Retrieve the path to a module file.
  file(file) {
    return path.join(this.data.path, file);
  }

  // Load all required stylesheets by requesting the MM object to load the files.
  loadStyles(cb) {
    this.loadDependencies("getStyles", cb);
  }

  // Load all required stylesheets by requesting the MM object to load the files.
  loadScripts(cb) {
    this.loadDependencies("getScripts", cb);
  }

  loadDependencies(funcName, cb) {
    let dependencies = this[funcName]();
    cb();
    //Promise.all(dependencies.map(dep => Loader.loadFile(dep, this, () => {}))).then(cb);
  }

  // Register a subclass
  static register(module) {
    // Create a subclass of this class with the properties of subclass
    function Legacy() {
      Module.call(this);
    }
    Legacy.prototype = Object.create(Module);
    Object.assign(Legacy.prototype, module);
    Legacy.name = name;
    Legacy.prototype.constructor = Legacy;
    this._setDefinition && this._setDefinition(Legacy);
    return Legacy;
  }
}
