import path from 'path';
import { nunjucks } from './mm2-globals';
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import useConstant from "use-constant";
import { useNotification, useCurrentConfig, useModifyConfig, useSocketNotification } from "@mm/hooks";
import type { ComponentProps } from "@mm/core";

type ModuleOverrides = Pick<Module, "init" | "start" | "getScripts" | "getStyles"
  | "getTranslations" | "getDom" | "getHeader" | "getTemplate" | "getTemplateData" | "notificationReceived"
  | "socketNotificationReceived" | "suspend" | "resume" | "requiresVersion" | "defaults">

/**
 * This Module class is provided only for backwards compatibility with
 * existing MagicMirror modules. These modules will subclass this class,
 * and the resulting instance will be wrapped in a React component.
 */
export class Module {
  /* All methods (and properties below can be overridden. */

  /** Set the minimum MagicMirror module version for this module. */
  requiresVersion = '2.0.0';
  /** Module config defaults. */
  defaults: Record<string, any> = {};
	/** Timer reference used for showHide animation callbacks. */
	showHideTimer?: number;
	/**
   * Array to store lockStrings. These strings are used to lock
	 * visibility when hiding and showing module.
   */
  lockStrings: string[] = [];

  /** Data used by the module */
  readonly data: Data;
  config: Data["config"];

  /** The name of the module. */
  get name() { return this.data.name }
  set name(val: Data["name"]) { this.data.name = val }

  /** The unique identifier of the module */
  get identifier() { return this.data.identifier }
  /** Whether the module is currently hidden */
  hidden: boolean;

  constructor(data: Data, injectedMethods: Inject) {
    this.data = data;
    this.hidden = false;
    this.config = { ...this.defaults, ...data.config };
    // copy injectedMethods onto this, like Object.assign but includes getters
    assignProperties(this, injectedMethods);
  }

  /**
	 * Is called when the module is instantiated.
   * @deprecated
	 */
  init() {}

  /**
   * Is called when the module is loaded.
   * @deprecated
   */
  loaded(cb?: () => void) {}

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

  static Sender = Symbol("sender") // sender key for useNotification

  /**
   * This method is called when a notification arrives.
	 * This method is called by the Magic Mirror core.
   */
  notificationReceived(notification: string, payload: any, sender: Module) {
    if (!sender && typeof payload === "object" && Module.Sender in payload) {
      sender = payload[Module.Sender];
    }
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
	 * The methods below don't need subclassing.
	 *********************************************/

  /* Instance methods injected through the constructor */
  // @ts-expect-error
  updateDom: Inject["updateDom"]
  // @ts-expect-error
  translate: Inject["translate"]

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
    return path.resolve(this.data.path, file);
  }

  /**
   * Load all required stylesheets and call cb when done.
   */
  loadStyles(cb: () => void) {
    Promise.all(this.getStyles().map(pathToUrlPath).map(dep => {
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

  static register(name: string, module: Partial<ModuleOverrides>) {
    class Subclass extends Module {
      name = name;
    }
    Object.assign(Subclass.prototype, module);
    return Subclass as typeof Module;
  }
}

function MMSocket(moduleName: string) {
  const socket = new WebSocket("/" + moduleName);
  socket.onopen = event => {
    socket.onmessage = event => {

    }

  }

  // Warning: this is not a public Socket.io API!!! Look for a better way to catch all events
  let onevent = (socket as any).onevent;
  if (typeof onevent === "function") {
    (socket as any).onevent = (packet: { data: any[] }, ...rest: unknown[]) => {
      onevent.apply(socket, [packet, ...rest]); // original call
      packet.data = ["*", ...packet.data];
      onevent.apply(socket, [packet, ...rest]); // additional call to catch-all
    };
  };

  return {
    sendNotification(notification: string, payload: any = {}, sender?: string) {
      socket.send(JSON.stringify([
        "notification",
        notification,
        payload,
        sender
      ]));
    },
    close() {
      socket.close();
    }
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

function pathToUrlPath(p: string) {
  return path.relative(process.cwd(), p).replace("\\", "/");
}

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

export type Inject = {
  updateDom(speed?: number): Promise<void>,

  translate(key: string, variables?: object, defaultValue?: string): string,
  translate(key: string, defaultValue?: string): string,
}

interface ModuleArray<T> extends Array<T> {
  withClass(classnames: string | string[]): ModuleArray<T>,
  exceptWithClass(classnames: string | string[]): ModuleArray<T>,
  exceptModule(module: T): ModuleArray<T>,
  enumerate: Array<T>["forEach"] // copy type from Array.forEach
}
type MMGlobal = {
  getModules(): ModuleArray<Module>,
  sendNotification(notification: string, payload?: any, sender?: Module): void,
  updateDom(module: Module, speed?: number): void,
  hideModule(module: Module, speed?: number, callback?: () => void, options?: LockOptions): void,
  showModule(module: Module, speed?: number, callback?: () => void, options?: LockOptions): void,
}

type LockOptions = {
  lockString: string,
  force: boolean,
}

/**
 * This Higher-Order Component takes an MM2 module and produces a React component
 * that provides compatibility between React MagicMirror modules and MM2 modules.
 */
export function makeCompat<T extends Module>(MM2: { new (...args: ConstructorParameters<typeof Module>): T }, name: string) {
  // Create a React component wrapping the given subclass
  function Compat(props: ComponentProps) {
    const { hidden } = props;

    const [dom, setDom] = useState<HTMLElement | null | undefined>(null);
    const modifyConfig = useModifyConfig();

    const mm2 = useConstant(() => {
      return new MM2(filterDataFromProps(props), {
        async updateDom(this: T, speed?: number) {
          const d = await this.getDom();
          const h = this.getHeader();
          if (d && !isElement(d)) {
            throw new Error(`Return value of getDom() is not an HTML element: ${d}`);
          } else {
            setDom(d);
            modifyConfig(conf => {
              conf.modules.find(m => m.identifier === props.identifier)!.header = h;
            })
          }
        },
        translate(key: string, variables?: object | string, defaultValue?: string): string {
          throw new Error("not implemented");
        }
      });
    });

    // Set data, initialize, and start on mount
    useEffect(() => {
      mm2.init();
      mm2.updateDom();
    }, [mm2]);
    useNotification("ALL_MODULES_LOADED", () => mm2.start());

    // Hook up Module#notificationReceived
    useNotification("*", (notification: string, payload: any) => {
      let sender = typeof payload === "object" && Module.Sender in payload ? payload[Module.Sender] : undefined;
      mm2.notificationReceived(notification, payload, sender);
    });
    // Hook up Module#socketNotificationReceived
    useSocketNotification(props.name, "*", (notification: string, payload: any) => {
      mm2.socketNotificationReceived(notification, payload);
    });

    // Handle suspend/resume on change of `hidden`
    useEffect(() => {
      mm2.hidden = hidden;
      if (hidden) {
        mm2.suspend();
      } else {
        mm2.resume();
      }
    }, [mm2, hidden]);

    // Display the DOM node
    return React.createElement(Escape, {dom});
  }

  // Assign correct .name property to make development easier
  Object.defineProperty(Compat, "name", {
    value: name,
    configurable: true
  });

  return Compat;
};

// Returns true if it is a DOM element
function isElement(o: any): o is HTMLElement {
  return (
    typeof HTMLElement === "object"
      ? o instanceof HTMLElement
      : o && typeof o === "object" && o.nodeType === 1 && typeof o.nodeName === "string"
  );
}

// An escape hatch from React. Pass the dom prop to imperatively add HTMLElements.
export function Escape({ dom, children: _, ...rest }: { dom: HTMLElement | undefined | null | false, [k: string]: any }) {
  const divRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const div = divRef.current;
    if (div && dom) {
      div.appendChild(dom);
      return () => {
        div.removeChild(dom);
      }
    }
  }, [dom]);
  return React.createElement("div", { ...rest, ref: divRef });
}

function filterDataFromProps({ classes, file, path, header, position, name, identifier, config }: Data) {
  return {
    classes,
    file,
    path,
    header,
    position,
    name,
    identifier,
    config,
  }
}

// Like Object.assign but includes getters, setters, and other property descriptors
function assignProperties(target: object, source: any) {
  for (const k in source) {
    if (Object.prototype.hasOwnProperty.call(source, k)) {
      Object.defineProperty(target, k, Object.getOwnPropertyDescriptor(source, k)!);
    }
  }
}