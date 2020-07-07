/*
 * MM2 modules expect these global variables and CSS.
 * These files are only imported if there are MM2 modules preset.
 */

// Because this package will be used with @mm/cli, it's okay to import CSS file
import "weathericons/css/weather-icons.css";
import "weathericons/css/weather-icons-wind.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "@fortawesome/fontawesome-free/css/v4-shims.min.css";
import { Module } from "./module";
import {
  internal_notificationEmitter,
  internal_getCurrentConfig,
  internal_modifyConfig,
  InternalModuleConfig,
} from "@mm/core";

// @ts-ignore
import moment from "moment-timezone";
// @ts-ignore
import nunjucks from "nunjucks";
// @ts-ignore
import SunCalc from "suncalc";
export { moment, nunjucks, SunCalc };

export const Log = console;

type LockOptions = {
  lockString: string;
  force: boolean;
};

export const MM = {
  getModules(): ModuleArray {
    const modules = internal_getCurrentConfig().modules;
    return new ModuleArray(...modules);
  },
  sendNotification(notification: string, payload?: any, sender?: Module) {
    if (typeof payload === "object" && sender) {
      payload = { ...payload, [Module.Sender]: sender };
    }
    internal_notificationEmitter.emit(notification, payload);
  },
  updateDom(module: Module, speed?: number) {
    throw new Error("not implemented");
  },
  hideModule(
    module: { identifier: string },
    speed?: number,
    callback?: () => void,
    options?: LockOptions
  ) {
    hideModule(module.identifier, true);
  },
  showModule(
    module: Module,
    speed?: number,
    callback?: () => void,
    options?: LockOptions
  ) {
    hideModule(module.identifier, false);
  },
};

function hideModule(identifier: string, hide: boolean) {
  internal_modifyConfig((conf) => {
    const mod = conf.modules.find((mod) => mod.identifier === identifier);
    if (mod) {
      mod.hidden = hide;
    }
  });
}

class ModuleArray extends Array<InternalModuleConfig> {
  /* withClass(className)
   * calls modulesByClass to filter modules with the specified classes.
   *
   * argument className string/array - one or multiple classnames. (array or space divided)
   *
   * return array - Filtered collection of modules.
   */
  withClass(className: string) {
    return this.modulesByClass(className, true);
  }

  /* exceptWithClass(className)
   * calls modulesByClass to filter modules without the specified classes.
   *
   * argument className string/array - one or multiple classnames. (array or space divided)
   *
   * return array - Filtered collection of modules.
   */
  exceptWithClass(className: string) {
    return this.modulesByClass(className, false);
  }

  /* modulesByClass(className, include)
   * filters a collection of modules based on classname(s).
   *
   * argument className string/array - one or multiple classnames. (array or space divided)
   * argument include boolean - if the filter should include or exclude the modules with the specific classes.
   *
   * return array - Filtered collection of modules.
   */
  modulesByClass(className: string | string[], include: boolean) {
    const searchClasses = Array.isArray(className)
      ? className
      : className.split(" ");
    return this.filter((module) => {
      let classes = module.classes.map(String.prototype.toLowerCase);
      if (
        searchClasses.some(
          (searchClass) => classes.indexOf(searchClass.toLowerCase()) !== -1
        )
      ) {
        return include;
      } else {
        return !include;
      }
    });
  }

  /* exceptModule(module)
   * Removes a module instance from the collection.
   *
   * argument module Module object - The module instance to remove from the collection.
   *
   * return array - Filtered collection of modules.
   */
  exceptModule(module: InternalModuleConfig) {
    return this.filter((mod) => mod.identifier !== module.identifier);
  }

  /* enumerate(callback)
   * Walks thru a collection of modules and executes the callback with the module as an argument.
   *
   * argument callback function - The function to execute with the module as an argument.
   */
  enumerate(callback: Parameters<Array<InternalModuleConfig>["forEach"]>[0]) {
    this.forEach(callback);
  }
}
