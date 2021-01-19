import { useState, useEffect } from "react";
import produce, { setAutoFreeze } from "immer";
import { ClientConfig, Config, initializeConfigClient } from "./types";

setAutoFreeze(false);

/*
 * Modules will control other modules by directly mutating the config object. We
 * can efficiently determine which properties have changed and rerender the
 * module components with the updated properties.
 */

/**
 * Simply initializes the config if it hasn't already been set.
 */
export function useInitializeConfig(initialConfig: Config) {
  if (config === null) {
    // directly set config; don't trigger listeners for initialization
    config = initializeConfigClient(initialConfig);
  }
  useEffect(
    () => () => {
      config = null;
    },
    []
  );
}

/**
 * To access the app configuration, call `const config = useCurrentConfig()`. The return value will be updated
 * when a module changes the configuration.
 */
export function useCurrentConfig(): ClientConfig;
export function useCurrentConfig<T>(selector: (c: ClientConfig) => T): T;
export function useCurrentConfig<T>(
  selector?: (currentConfig: ClientConfig) => T
): T | ClientConfig {
  const [, updateState] = useState({});
  // Subscribe to config changes and force rerender every time the config updates
  useEffect(() => subscribeToConfigUpdates(() => updateState({})), []);
  const currentConfig = getCurrentConfig();
  const selected = selector ? selector(currentConfig) : currentConfig;
  return selected;
}

/**
 * To fully replace the app configuration, call `setCurrentConfig(newConfig);`
 * Make sure not to miss any properties that were in the original config, or they will be lost.
 * Any modules using changed portions of the config will be rerendered.
 */
export function setCurrentConfig(
  newConfig: ClientConfig | ((currentConfig: ClientConfig) => ClientConfig)
) {
  let c =
    typeof newConfig === "function" ? newConfig(getCurrentConfig()) : newConfig;
  config = c;
  listeners.forEach((listener) => listener(c));
}

/**
 * To modify a piece of the app configuration, call
 * `modifyCurrentConfig(conf => conf.modules[0].header = 'new header')`
 * There's no need to return the conf object. Any modules using changed portions of the config
 * will be rerendered.
 */
export function modifyCurrentConfig(modify: (conf: ClientConfig) => void) {
  setCurrentConfig(produce(modify));
}

/********** Private API ***********/

type Listener = (config: ClientConfig) => void;
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
let config: ClientConfig | null = null;

/**
 * Access the current config. Use @see useCurrentConfig for a React hook version that subscribes to config updates.
 * @private
 */
export function getCurrentConfig(): ClientConfig {
  if (!config) {
    throw new Error("Tried to access config before initializing.");
  }
  return config;
}
