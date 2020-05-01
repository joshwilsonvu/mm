/**
 * This Module class is provided only for backwards compatibility with
 * existing MagicMirror plugins. These plugins will subclass this class,
 * and the resulting instance will be wrapped in a React component.
 */
import io from 'socket.io-client';
import path from 'path';
import nunjucks from 'nunjucks';

// The type of the MM2 data property
export type Data = {
  classes: string[],
  file: string,
  path: string,
  header: string,
  position: string,
  name: string,
  identifier: string,
  config: Module["defaults"],
}

interface ModuleArray<T> extends Array<T> {
  withClass(classnames: string | string[]): ModuleArray<T>,
  exceptWithClass(classnames: string | string[]): ModuleArray<T>,
  exceptModule(module: T): ModuleArray<T>,
  enumerate: Array<T>["forEach"] // copy type from Array.forEach
}
export type MMGlobal = {
  getModules(): Array<Module>,
  sendNotification(notification: string, payload?: any, sender?: Module): void,
  updateDom(module: Module, speed?: number): void,
  hideModule(module: Module, speed?: number, callback?: () => void, options?: LockOptions): void,
  showModule(module: Module, speed?: number, callback?: () => void, options?: LockOptions): void,
}

type LockOptions = {
  lockString: string,
  force: boolean,
}

type Extras = {
  translator(str: string): string,
  MM: MMGlobal,
}

/**
 * This should just be a typed version of the MM2 module file. Everything needed to make it
 * compatible with the React API should go, appropriately, in make-compat.
 */
export class Module {
  /* All methods (and properties below can be overridden. */

  /** Set the minimum MagicMirror module version for this module. */
  requiresVersion = '2.0.0';
  /** Module config defaults. */
  defaults: Record<string, any> = {};
  /** The name of the module. */
  name: Data["name"];
	/** Timer reference used for showHide animation callbacks. */
	showHideTimer?: number;
	/**
   * Array to store lockStrings. These strings are used to lock
	 * visibility when hiding and showing module.
   */
	lockStrings: string[] = [];
  /**
   * Data used by the module
   */
  readonly data: Data;
  // Certain data fields are also available on the instance
  identifier: Data["identifier"];
  config: Data["config"];
  hidden: boolean;

  // only let derived classes be instantiated
  constructor(data: Data & Extras) {
    this.data = data;
    this.name = data.name;
    this.identifier = data.identifier;
    this.hidden = false;
    this.config = { ...this.defaults, ...data.config };
  }

  /**
	 * Is called when the module is instantiated.
   * @deprecated
	 */
  init() {}

  /**
	 * Is called when the module is started.
	 */
  start() {
    console.info(`Starting module: ${this.name}`);
  }

  /**
   * Returns a list of scripts the module requires to be loaded.
   */
  getScripts(): string[] {
    return [];
  }

  /**
   * Returns a list of stylesheets the module requires to be loaded.
   */
  getStyles(): string[] {
    return [];
  }

  /**
   * Returns a map of translation files the module requires to be loaded.
   */
  getTranslations(): Record<string, string> | false | null | undefined {
    return false;
  }

  /**
   * This method generates the dom which needs to be displayed. This method is called by the Magic Mirror core.
	 * This method can to be subclassed if the module wants to display info on the mirror.
	 * Alternatively, the getTemplate method could be subclassed.
   */
  getDom(): Promise<HTMLElement> | HTMLElement | null | undefined {
    let div = document.createElement('div');
    let template = this.getTemplate();
    let templateData = this.getTemplateData();

    if (/^.*((\.html)|(\.njk))$/.test(template)) {
      // the template is a filename
      return new Promise((resolve, reject) => {
        getNunjucksEnvironment(this).render(
          template,
          templateData,
          (err, res) => {
            if (err) {
              console.error(err);
              reject(err);
            } else {
              res && (div.innerHTML = res);
              resolve(div);
            }
          }
        );
      });
    } else {
      // the template is a template string.
      div.innerHTML = getNunjucksEnvironment(this).renderString(
        template,
        templateData
      );
      return div;
    }
  }

  /**
   * This method generates the header string which needs to be displayed if a user has a header configured for this module.
	 * This method is called by the Magic Mirror core, but only if the user has configured a default header for the module.
	 * This method needs to be subclassed if the module wants to display modified headers on the mirror.
   */
  getHeader() {
    return this.data.header;
  }

  /**
   * This method returns the template for the module which is used by the default getDom implementation.
	 * This method needs to be subclassed if the module wants to use a template.
	 * It can either return a template sting, or a template filename.
	 * If the string ends with '.html' it's considered a file from within the module's folder.
   */
  getTemplate() {
    return `<div class="normal">${this.name}</div><div class="small dimmed">${this.identifier}</div>`;
  }

  /**
   * This method returns the data to be used in the template.
	 * This method needs to be subclassed if the module wants to use a custom data.
   */
  getTemplateData() {
    return {};
  }

  /**
   * This method is called when a notification arrives.
	 * This method is called by the Magic Mirror core.
   */
  notificationReceived(notification: string, payload: any, sender: Module) {
    if (sender) {
      console.log(
        `${this.name} received a module notification: ${notification} from sender: ${sender.name}`
      );
    } else {
      console.log(
        `${this.name} received a system notification: ${notification}`
      );
    }
  }

  /**
	 * Returns the nunjucks environment for the current module.
	 */
	nunjucksEnvironment() {
    return getNunjucksEnvironment(this);
  }

  /**
   * This method is called when a socket notification arrives.
   */
  socketNotificationReceived(notification: string, payload: any) {
    console.log(
      `${this.name} received a socket notification: ${notification} - Payload: ${payload}`
    );
  }

  /**
   * This method is called when a module is hidden.
   */
  suspend(): void {
    console.log(`${this.name} is suspended.`);
  }

  /**
   * This method is called when a module is shown.
   */
  resume(): void {
    console.log(`${this.name} is resumed.`);
  }

  /*********************************************
	 * The methods below don"t need subclassing. *
	 *********************************************/

  // No-ops, so app doesn't crash if called
  /**
   * @deprecated
   */
  setData() {}
  /**
   * @deprecated
   */
  setConfig() {}

  /**
   * Returns a socket object. If it doesn't exist, it's created.
   * It also registers the notification callback.
   */
  socket() {
    return getSocket(this);
  }

  /**
   * Retrieve the path to a module file.
   */
  file(file: string) {
    return path.normalize(path.join(this.data.path, file));
  }

  /**
   * Load all required stylesheets and call cb when done.
   */
  loadStyles(cb: () => void) {
    Promise.all(this.getStyles().map(dep => {
      return new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.addEventListener("load", resolve);
        link.addEventListener("error", reject);
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = path.resolve(dep);
        document.head.appendChild(link);
      })
    })).then(cb);
  }

  /**
   * Load all required stylesheets and call cb when done.
   */
  loadScripts(cb: () => void) {
    return Promise.all(this.getScripts().map(dep => {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.addEventListener("load", resolve);
        script.addEventListener("error", reject);
        script.async = true;
        script.src = dep;
        document.head.appendChild(script);
      })
    })).then(cb);
  }

  /**
   * Load all required translations.
   */
  loadTranslations(cb: () => void) {
    const translations = this.getTranslations();
    // const lang = globalConfig.language.toLowerCase();
    // if (translations) {

    // }
    throw new Error("not implemented");
  }

  /**
   * Request the translation for a given key with optional variables and default value.
   */
  translate(key: string, variables?: object, defaultValue?: string): string;
  translate(key: string, defaultValue?: string): string;
  translate(key: string, variables?: object | string, defaultValue?: string): string {
    throw new Error("not implemented");
  }

  static register(name: string, module: Partial<Module>): typeof Module {
    class Subclass extends Module {
      name = name;
    }
    Object.assign(Subclass.prototype, module);
    return Subclass;
  }
}

function MMSocket(moduleName: string) {
  const socket = io("/" + moduleName);
  // Warning: this is not a public Socket.io API!!! Look for a better way to catch all events
  let onevent = (socket as any).onevent;
  if (typeof onevent === "function") {
    (socket as any).onevent = (packet: { data: any[] }, ...rest: unknown[]) => {
      onevent.call(socket, packet); // original call
      packet.data = ["*", ...packet.data];
      onevent.call(socket, packet); // additional call to catch-all
    };
  };

  return {
    sendNotification(notification: string, payload: any = {}, sender?: string) {
      socket.emit("notification", {
        notification,
        payload,
        sender
      });
    },
  };
}

const nunjucksMap = new WeakMap<Module, nunjucks.Environment>();
function getNunjucksEnvironment(module: Module) {
  let env = nunjucksMap.get(module);
  if (!env) {
    env = new nunjucks.Environment(
      new nunjucks.WebLoader(module.file(''), { async: true }), {
        trimBlocks: true,
        lstripBlocks: true,
      }
    );
    env.addFilter('translate', (str: string) => module.translate(str));
    nunjucksMap.set(module, env);
  }
  return env;
};

const socketMap = new WeakMap<Module, ReturnType<typeof MMSocket>>();
function getSocket(module: Module) {
  let socket = socketMap.get(module);
  if (!socket) {
    socket = MMSocket(module.name);
    socketMap.set(module, socket);
  }
  return socket;
};
