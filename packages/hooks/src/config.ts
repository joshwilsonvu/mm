import * as React from 'react';
import produce from 'immer';
import { InternalConfig as Config } from "@mm/core";

export {
  ConfigProvider,
  useCurrentConfig,
  useModifyConfig,
  useSetConfig,
};

type ConfigContextProps = { config?: Config, setConfig?: React.Dispatch<React.SetStateAction<Config>> };
type ConfigContextArray = [ ConfigContextProps["config"]?, ConfigContextProps["setConfig"]? ];
const Context = React.createContext<ConfigContextArray>([]);

/**
 * Include this component in the tree to use `useCurrentConfig`, `useModifyConfig`, and `useSetConfig`.
 */
function ConfigProvider({ config, setConfig, children }: React.PropsWithChildren<ConfigContextProps>) {
  // memoize value to minimize rerenders
  const memo = React.useMemo(() => ([config, setConfig] as ConfigContextArray), [config, setConfig]);
  return React.createElement(Context.Provider, { value: memo }, children);
}

/**
 * To access the app configuration, call `const config = useCurrentConfig()`. The return value will be updated
 * when a module changes the configuration.
 */
function useCurrentConfig() {
  const [config] = React.useContext(Context);
  return config;
}

/**
 * To fully replace the app configuration, call `const setConfig = useSetConfig(); ... setConfig(newConfig);`
 * Make sure not to miss any properties that were in the original config, or they will be lost.
 * Any modules using changed portions of the config will be rerendered.
 */
function useSetConfig() {
  const [, setConfig ] = React.useContext(Context);
  return setConfig;
}

/**
 * To modify a piece of the app configuration, call
 * `const modify = useModifyConfig(); ... modify(conf => conf.modules[0].header = 'new header')`
 * There's no need to return the conf object. Any modules using changed portions of the config
 * will be rerendered.
 */
function useModifyConfig() {
  const setConfig = useSetConfig();
  const setConfigImmer = React.useCallback((modify: (conf: Config) => void) => {
    setConfig && setConfig(produce(modify));
  }, [setConfig]);
  return setConfigImmer;
}

