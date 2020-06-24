/**
 * This file implements a subset of a real MagicMirror implementation for testing purposes.
 */

import React from "react";
import * as Core from "../src";

/**
 * Modules will control other modules by directly mutating the config object. We
 * can efficiently determine which properties have changed and rerender the
 * module components with the updated properties.
 */
function useModulesFromConfig(dynamicConfig: Core.InternalConfig) {
  // same input, same output for each element of the array
  const modules = Core.useMemoArray(
    dynamicConfig.modules,
    (m: Core.InternalModuleConfig) => {
      return <MagicMirrorModule {...m} key={m.identifier} />;
    },
    []
  );
  return modules;
}

function MagicMirrorModule({
  _component,
  ...props
}: Core.InternalModuleConfig) {
  const Component = _component;
  return props.disabled ? null : (
    <Core.ModuleGuard name={Component.name}>
      <div
        className={["module", Component.name, ...(props.classes || [])].join(
          " "
        )}
        id={props.identifier}
      >
        {props.header && (
          <header className="module-header">{props.header}</header>
        )}
        <div className="module-content">
          <Component {...props} />
        </div>
      </div>
    </Core.ModuleGuard>
  );
}

function MagicMirrorFixture({ initialConfig }: { initialConfig: Core.Config }) {
  // initialConfig is only initial arg, the component will copy it and manage the copy
  const [config, setConfig] = React.useState(() =>
    Core.initializeConfigClient(initialConfig)
  );

  const modules = useModulesFromConfig(config);
  return (
    <React.StrictMode>
      <Core.NotificationProvider>
        <Core.ConfigProvider config={config} setConfig={setConfig}>
          <Core.ModuleLayout>{modules}</Core.ModuleLayout>
        </Core.ConfigProvider>
      </Core.NotificationProvider>
    </React.StrictMode>
  );
}

export default MagicMirrorFixture;
