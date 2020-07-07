import * as React from "react";
import produce from "immer";
import {
  InternalConfig as Config,
  InternalModuleConfig as ModuleConfig,
} from "../types";

/*
 * Modules will control other modules by directly mutating the config object. We
 * can efficiently determine which properties have changed and rerender the
 * module components with the updated properties.
 */

/**
 * Simply initializes the config if it hasn't already been set.
 */
export function useInitializeConfig(initialConfig: Config | (() => Config)) {
  if (config === null) {
    // directly set config; don't trigger listeners for initialization
    config =
      typeof initialConfig === "function" ? initialConfig() : initialConfig;
  }
}

/**
 * To access the app configuration, call `const config = useCurrentConfig()`. The return value will be updated
 * when a module changes the configuration.
 */
export function useCurrentConfig() {
  const [, updateState] = React.useState({});
  // Subscribe to config changes and orce rerender every time the config updates
  React.useEffect(() => subscribeToConfigUpdates(() => updateState({})), []);
  return private_getCurrentConfig();
}

/**
 * To fully replace the app configuration, call `const setConfig = useSetConfig(); ... setConfig(newConfig);`
 * Make sure not to miss any properties that were in the original config, or they will be lost.
 * Any modules using changed portions of the config will be rerendered.
 */
export function useSetConfig() {
  return private_setCurrentConfig;
}

/**
 * To modify a piece of the app configuration, call
 * `const modify = useModifyConfig(); ... modify(conf => conf.modules[0].header = 'new header')`
 * There's no need to return the conf object. Any modules using changed portions of the config
 * will be rerendered.
 */
export function useModifyConfig() {
  return modifyConfig;
}

/**
 * Like useModifyConfig, except the modify function only receives the module with a matching identifier,
 * not the full internal config object.
 */
export function useModifyOwnConfig(identifier: string) {
  const modifyOwnConfig = React.useCallback(
    (modifyOwn: (mod: ModuleConfig) => void) => {
      modifyConfig((conf: Config) => {
        const mod = conf.modules.find((mod) => mod.identifier === identifier);
        mod && modifyOwn(mod);
      });
    },
    [identifier]
  );
  return modifyOwnConfig;
}

/********** Private API ***********/

type Listener = (config: Config) => void;
const listeners = new Set<Listener>();
function subscribeToConfigUpdates(listener: Listener) {
  if (typeof listener === "function") {
    listeners.add(listener);
  }
  return function unsubscribe() {
    listeners.delete(listener);
  };
}

// Keep the current dynamic config as a hidden module variable
let config: Config | null = null;

/**
 * Access the current config. Use @see useInitializeConfig for a React hook version that subscribes to config updates.
 * @private
 */
export function private_getCurrentConfig(): Config {
  if (!config) {
    throw new Error("Tried to access config before initializing.");
  }
  return config;
}

/**
 * Replace the current config value. Like React's setState, but framework agnostic.
 * @param newConfig
 * @private
 */
export function private_setCurrentConfig(
  newConfig: Config | ((currentConfig: Config) => Config)
) {
  let c =
    typeof newConfig === "function"
      ? newConfig(private_getCurrentConfig())
      : newConfig;
  config = c;
  listeners.forEach((listener) => listener(c));
}

/**
 * Mutate the current config value in place. Uses immer to keep things immutable.
 * @param modify
 */
function modifyConfig(modify: (conf: Config) => void) {
  private_setCurrentConfig(produce(modify));
}
